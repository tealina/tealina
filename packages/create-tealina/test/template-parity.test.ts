import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import {
  kServerTemplates,
  templateRootDir,
  type ServerTemplate,
} from '../src/core.js'
import type { Mode } from '../src/template-manifest.js'

/**
 * T6 — the six server trees, held against each other.
 *
 * Three frameworks times two modes is the largest surface in this package, and it is the
 * one where a change is easiest to make in one place and forget in five. Nothing else
 * fails when that happens: the tree that missed the edit still builds, its tests still
 * pass, and the difference only appears in a project scaffolded with that combination.
 *
 * Two invariants are enough to catch the common shape of the mistake:
 *
 *   1. within one framework, the TypeScript and JavaScript trees carry the same files;
 *   2. across all six trees, the api and access directories have the same layout.
 *
 * File contents are not compared. A JavaScript tree is a translation, not a copy, and the
 * frameworks legitimately differ in their routing files (`doc` vs `docs`, fastify's
 * module augmentation).
 */

const treeDir = (fw: ServerTemplate, mode: Mode) =>
  path.join(templateRootDir, `server/${mode === 'js' ? `${fw}-js` : fw}`)

const walk = (dir: string): string[] => {
  const out: string[] = []
  const visit = (rel: string) => {
    for (const entry of fs.readdirSync(path.join(dir, rel), {
      withFileTypes: true,
    })) {
      if (entry.name === '.DS_Store') continue
      const child = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) visit(child)
      else out.push(child)
    }
  }
  visit('')
  return out.sort()
}

/** `foo.ts` and `foo.js` are the same file in the two trees; a `.d.ts` spells itself. */
const bare = (rel: string) =>
  rel.endsWith('.d.ts') ? rel : rel.replace(/\.(ts|js)$/, '')

const layout = (fw: ServerTemplate, mode: Mode) =>
  walk(treeDir(fw, mode))
    .map(bare)
    .filter(rel => rel.startsWith('src/api/') || rel.startsWith('src/access/'))

const readText = (rel: string) =>
  fs.readFileSync(path.join(templateRootDir, rel), 'utf8')

describe('server template parity', () => {
  for (const fw of kServerTemplates) {
    it(`${fw}: the TypeScript and JavaScript trees carry the same files`, () => {
      const ts = new Set(walk(treeDir(fw, 'ts')).map(bare))
      const js = new Set(walk(treeDir(fw, 'js')).map(bare))

      // A `.d.ts` belongs to the TypeScript tree but is shared with the JavaScript one
      // through the manifest, so it has no JavaScript counterpart to look for.
      const tsOnly = [...ts].filter(
        rel => !js.has(rel) && !rel.endsWith('.d.ts'),
      )
      const jsOnly = [...js].filter(rel => !ts.has(rel))

      expect({ tsOnly: tsOnly.sort(), jsOnly: jsOnly.sort() }).toEqual({
        tsOnly: [],
        jsOnly: [],
      })
    })
  }

  it('the v1 name is coherent in every tree', () => {
    // `v1` is not decorative: the api directory, the package export, the type file, the
    // document filename and the docs route all spell it, and a rename that misses one of
    // them fails at runtime or, worse, silently serves an empty document.
    //
    // The type file is shared by all six trees through `common/`; the manifest copies it
    // into each tree at scaffold time, which is why every `exports` entry can name it.
    const sharedTypes = readText('common/types/v1.d.ts')
    expect(sharedTypes, 'common type entry').contain('src/api/v1/index')

    for (const fw of kServerTemplates) {
      for (const mode of ['ts', 'js'] as const) {
        const dir = `server/${mode === 'js' ? `${fw}-js` : fw}`
        const ext = mode === 'js' ? '.js' : '.ts'
        const pkg = JSON.parse(readText(`${dir}/package.json`)) as {
          exports: Record<string, { types?: string }>
          scripts: Record<string, string>
        }

        expect(pkg.exports['./api/v1']?.types, `${dir} exports`).eq(
          './types/v1.d.ts',
        )
        for (const script of ['v1', 'align', 'gdoc']) {
          expect(pkg.scripts[script], `${dir} ${script}`).contain('src/api/v1')
        }
        expect(
          fs.existsSync(path.join(treeDir(fw, mode), 'src/api/v1')),
          `${dir}/src/api/v1`,
        ).eq(true)
        const docFile = ['doc', 'docs']
          .map(name => `src/routes/static/${name}${ext}`)
          .find(rel => fs.existsSync(path.join(treeDir(fw, mode), rel))) as
          | string
          | undefined
        expect(docFile, `${dir} docs route`).toBeDefined()
        const route = readText(`${dir}/${docFile}`)
        expect(route, `${dir} jsonURL`).contain('docs/v1.json')
        expect(route, `${dir} baseURL`).contain("'/api/v1'")
      }
    }

    for (const mode of ['ts', 'js'] as const) {
      const dir = mode === 'js' ? 'web/js' : 'web'
      const ext = mode === 'js' ? '.js' : '.ts'
      expect(readText(`${dir}/src/api/client${ext}`)).contain('server/api/v1')
    }
  })

  it('every framework exposes the same api and access layout', () => {
    const expected = layout('express', 'ts')
    const actual = Object.fromEntries(
      kServerTemplates.flatMap(fw =>
        (['ts', 'js'] as const).map(mode => [
          `${fw}/${mode}`,
          layout(fw, mode),
        ]),
      ),
    )
    expect(actual).toEqual(
      Object.fromEntries(Object.keys(actual).map(key => [key, expected])),
    )
  })
})

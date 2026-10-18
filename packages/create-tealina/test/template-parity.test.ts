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
 * T6 — the six backend trees, held against each other.
 *
 * Three frameworks times two modes is the largest surface in this package, and it is the
 * one where a change is easiest to make in one place and forget in five. Nothing else fails
 * when that happens: the tree that missed the edit still builds, its tests still pass, and
 * the difference only appears in a project scaffolded with that combination.
 *
 * The layout now repeats per package — `core`, `api-v1`, `server` — so the first invariant
 * is per package rather than per tree: within one framework, the TypeScript and JavaScript
 * copies carry the same files. The second is across all six: the api, core and mount
 * surfaces have the same shape whichever framework names them.
 *
 * File contents are not compared. A JavaScript tree is a translation, not a copy, and the
 * frameworks legitimately differ in their router files (fastify's module augmentation).
 */

const suffix = (mode: Mode) => (mode === 'js' ? '-js' : '')
const treeDir = (pkg: string, fw: ServerTemplate, mode: Mode) =>
  path.join(templateRootDir, `${pkg}/${fw}${suffix(mode)}`)

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

const readText = (rel: string) =>
  fs.readFileSync(path.join(templateRootDir, rel), 'utf8')

const readJson = (rel: string) =>
  JSON.parse(readText(rel)) as {
    dependencies?: Record<string, string>
    exports?: Record<string, { types?: string; import?: string }>
    scripts?: Record<string, string>
  }

describe('backend template parity', () => {
  for (const fw of kServerTemplates) {
    for (const pkg of ['core', 'api-v1', 'server']) {
      it(`${pkg}/${fw}: the TypeScript and JavaScript trees carry the same files`, () => {
        const ts = new Set(walk(treeDir(pkg, fw, 'ts')).map(bare))
        const js = new Set(walk(treeDir(pkg, fw, 'js')).map(bare))

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
  }

  it('the api artifacts keep fixed names in every tree', () => {
    // The directory name is configuration, not an artifact name. `apiDir` says where the
    // route tree is read from; `types/api.d.ts` and `exports["./api"]` stay put when it
    // moves. A tree that spells the directory into a public name is the coupling this test
    // is here to catch.
    const sharedTypes = readText('common/api-v1/types/api.d.ts')
    expect(sharedTypes, 'common type entry').contain('../src/api/index.js')
    expect(sharedTypes, 'the handler types come from core').contain(
      "from 'core/handler'",
    )

    for (const mode of ['ts', 'js'] as const) {
      const config =
        mode === 'js'
          ? 'common/js/api-v1/tealina.config.js'
          : 'common/api-v1/tealina.config.ts'
      const text = readText(config)
      expect(text, `${config} apiDir`).contain("apiDir: 'src/api'")
      expect(text, `${config} apiBaseURL`).contain('apiBaseURL: API_BASE_URL')
      expect(text, `${config} handlerImport`).contain(
        "handlerImport: 'core/handler'",
      )
    }

    for (const fw of kServerTemplates) {
      for (const mode of ['ts', 'js'] as const) {
        const dir = `api-v1/${fw}${suffix(mode)}`
        const ext = mode === 'js' ? '.js' : '.ts'
        const pkg = readJson(`${dir}/package.json`)

        expect(pkg.exports?.['./api']?.types, `${dir} exports`).eq(
          './types/api.d.ts',
        )
        expect(pkg.exports?.['./version']?.import, `${dir} version`).eq(
          './version.js',
        )
        expect(pkg.dependencies?.['core'], `${dir} depends on core`).toBe(
          'workspace:*',
        )
        for (const script of ['create', 'align', 'gdoc']) {
          expect(pkg.scripts?.[script], `${dir} ${script}`).not.contain(
            'src/api',
          )
        }
        for (const bareName of ['router', 'doc', 'mount']) {
          expect(
            fs.existsSync(
              path.join(treeDir('api-v1', fw, mode), `src/${bareName}${ext}`),
            ),
            `${dir}/src/${bareName}${ext}`,
          ).eq(true)
        }
        const mount = readText(`${dir}/src/mount${ext}`)
        expect(mount, `${dir} mount prefix`).contain('API_BASE_URL')
        expect(mount, `${dir} returns its doc source`).contain(
          'return docSource',
        )
        const doc = readText(`${dir}/src/doc${ext}`)
        expect(doc, `${dir} jsonURL`).contain("'../docs/api.json'")
        expect(doc, `${dir} baseURL`).contain('API_BASE_URL')
        expect(doc, `${dir} json path`).contain('/_doc/api.json')

        const serverDir = `server/${fw}${suffix(mode)}`
        const serverDoc = readText(`${serverDir}/src/doc${ext}`)
        expect(serverDoc, `${serverDir}/src/doc${ext} basename`).contain(
          "VDOC_BASENAME = '/api-doc'",
        )
        expect(serverDoc, `${serverDir}/src/doc${ext} page`).contain(
          'assembleHTML',
        )
      }
    }

    for (const mode of ['ts', 'js'] as const) {
      const dir = mode === 'js' ? 'web/js' : 'web'
      const ext = mode === 'js' ? '.js' : '.ts'
      expect(readText(`${dir}/src/api/client${ext}`)).contain('api-v1/api')
      expect(readText(`${dir}/src/api/client${ext}`)).contain('api-v1/version')
      expect(readText(`${dir}/src/api/client${ext}`)).not.contain('server/api')
    }
  })

  it('the version constants are the only place the prefixes are written', () => {
    const version = readText('common/api-v1/version.js')
    expect(version).contain("export const API_VERSION = 'v1'")
    expect(version).contain('export const API_BASE_URL = `/api/${API_VERSION}`')

    // Every consumer reads them rather than restating them: the config, the mount, the doc
    // route, the server's log line, the client and the dev proxy. A literal that reappears
    // in one of those is a prefix that can drift from the others.
    for (const fw of kServerTemplates) {
      for (const mode of ['ts', 'js'] as const) {
        const ext = mode === 'js' ? '.js' : '.ts'
        const dir = `api-v1/${fw}${suffix(mode)}`
        for (const file of ['src/mount', 'src/doc']) {
          const text = readText(`${dir}/${file}${ext}`)
          expect(text, `${dir}/${file}${ext}`).not.contain("'/api/v1'")
          expect(text, `${dir}/${file}${ext}`).not.contain("'/api-doc'")
        }
      }
    }
  })

  it('every framework exposes the same core, api and mount layout', () => {
    const layout = (fw: ServerTemplate, mode: Mode) => {
      const api = walk(treeDir('api-v1', fw, mode))
        .map(bare)
        .filter(
          rel =>
            rel.startsWith('src/api/') ||
            ['src/router', 'src/doc', 'src/mount'].includes(rel),
        )
      const core = walk(treeDir('core', fw, mode))
        .map(bare)
        .filter(rel => rel.startsWith('src/access/'))
      return [
        ...core.map(rel => `core/${rel}`),
        ...api.map(rel => `api/${rel}`),
      ]
    }
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

  it('the dependencies point one way', () => {
    // core -> api-v1 -> server. A cycle here is the failure that a package split is meant
    // to prevent: the contract layer reaching for a route, or a version reaching for the
    // host it is mounted by.
    for (const mode of ['ts', 'js'] as const) {
      for (const fw of kServerTemplates) {
        const core = readJson(`core/${fw}${suffix(mode)}/package.json`)
        const api = readJson(`api-v1/${fw}${suffix(mode)}/package.json`)
        const server = readJson(`server/${fw}${suffix(mode)}/package.json`)

        expect(core.dependencies?.['api-v1'], `core/${fw}`).toBeUndefined()
        expect(core.dependencies?.server, `core/${fw}`).toBeUndefined()
        expect(api.dependencies?.['core'], `api-v1/${fw}`).eq('workspace:*')
        expect(api.dependencies?.server, `api-v1/${fw}`).toBeUndefined()
        expect(server.dependencies?.['api-v1'], `server/${fw}`).eq(
          'workspace:*',
        )
        expect(server.dependencies?.core, `server/${fw}`).toBeUndefined()
      }
    }
  })

  it('every JavaScript package keeps only checked JavaScript', () => {
    // The reverse of the TypeScript trees' rule: a `.ts` file in a `-js` tree is a file the
    // JavaScript package's `tsc --noEmit` was not asked to read.
    for (const fw of kServerTemplates) {
      for (const pkg of ['core', 'api-v1', 'server']) {
        const offenders = walk(treeDir(pkg, fw, 'js')).filter(
          rel => rel.endsWith('.ts') && !rel.endsWith('.d.ts'),
        )
        expect(offenders, `${pkg}/${fw}-js`).toEqual([])
      }
    }
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import {
  kServerTemplates,
  templateRootDir,
  type ServerTemplate,
} from '../src/core.js'

/**
 * T6 — the three backend trees, held against each other.
 *
 * Three frameworks is the largest surface in this package, and the one where a change is
 * easiest to make in one place and forget in the other two. Nothing else fails when that
 * happens: the tree that missed the edit still builds, its tests still pass, and the
 * difference only appears in a project scaffolded with that framework.
 *
 * The layout repeats per package — `core`, `api-v1`, `server` — so the invariants here are
 * across frameworks rather than between language copies: the api, core and mount surfaces
 * keep the same shape whichever framework names them, the artifacts keep fixed names, and
 * the dependencies point one way.
 *
 * File contents are not compared. The frameworks legitimately differ in their router files
 * (fastify's module augmentation), and a translation check between frameworks would be an
 * assertion that they are the same file, which they are not.
 */

const treeDir = (pkg: string, fw: ServerTemplate) =>
  path.join(templateRootDir, `${pkg}/${fw}`)

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

const readText = (rel: string) =>
  fs.readFileSync(path.join(templateRootDir, rel), 'utf8')

const readJson = (rel: string) =>
  JSON.parse(readText(rel)) as {
    dependencies?: Record<string, string>
    exports?: Record<string, { types?: string; import?: string }>
    scripts?: Record<string, string>
  }

describe('backend template parity', () => {
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

    const config = 'common/api-v1/tealina.config.ts'
    const text = readText(config)
    expect(text, `${config} apiDir`).contain("apiDir: 'src/api'")
    expect(text, `${config} apiBaseURL`).contain('apiBaseURL: API_BASE_URL')
    expect(text, `${config} handlerImport`).contain(
      "handlerImport: 'core/handler'",
    )

    for (const fw of kServerTemplates) {
      const dir = `api-v1/${fw}`
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
        expect(pkg.scripts?.[script], `${dir} ${script}`).not.contain('src/api')
      }
      for (const bareName of ['router', 'doc', 'mount']) {
        expect(
          fs.existsSync(path.join(treeDir('api-v1', fw), `src/${bareName}.ts`)),
          `${dir}/src/${bareName}.ts`,
        ).eq(true)
      }
      const mount = readText(`${dir}/src/mount.ts`)
      expect(mount, `${dir} mount prefix`).contain('API_BASE_URL')
      expect(mount, `${dir} returns its doc source`).contain('return docSource')
      const doc = readText(`${dir}/src/doc.ts`)
      expect(doc, `${dir} jsonURL`).contain("'../docs/api.json'")
      expect(doc, `${dir} baseURL`).contain('API_BASE_URL')
      expect(doc, `${dir} json path`).contain('/_doc/api.json')

      const serverDoc = readText(`server/${fw}/src/doc.ts`)
      expect(serverDoc, `server/${fw}/src/doc.ts basename`).contain(
        "VDOC_BASENAME = '/api-doc'",
      )
      expect(serverDoc, `server/${fw}/src/doc.ts page`).contain('assembleHTML')
    }

    expect(readText('web/src/api/client.ts')).contain('api-v1/api')
    expect(readText('web/src/api/client.ts')).contain('api-v1/version')
    expect(readText('web/src/api/client.ts')).not.contain('server/api')
  })

  it('the version constants are the only place the prefixes are written', () => {
    const version = readText('common/api-v1/version.js')
    expect(version).contain("export const API_VERSION = 'v1'")
    expect(version).contain('export const API_BASE_URL = `/api/${API_VERSION}`')

    // Every consumer reads them rather than restating them: the config, the mount, the doc
    // route, the server's log line, the client and the dev proxy. A literal that reappears
    // in one of those is a prefix that can drift from the others.
    for (const fw of kServerTemplates) {
      const dir = `api-v1/${fw}`
      for (const file of ['src/mount', 'src/doc']) {
        const text = readText(`${dir}/${file}.ts`)
        expect(text, `${dir}/${file}.ts`).not.contain("'/api/v1'")
        expect(text, `${dir}/${file}.ts`).not.contain("'/api-doc'")
      }
    }
  })

  it('every framework exposes the same core, api and mount layout', () => {
    const layout = (fw: ServerTemplate) => {
      const api = walk(treeDir('api-v1', fw)).filter(
        rel =>
          rel.startsWith('src/api/') ||
          ['src/router.ts', 'src/doc.ts', 'src/mount.ts'].includes(rel),
      )
      const core = walk(treeDir('core', fw)).filter(rel =>
        rel.startsWith('src/access/'),
      )
      return [
        ...core.map(rel => `core/${rel}`),
        ...api.map(rel => `api/${rel}`),
      ]
    }
    const expected = layout('express')
    const actual = Object.fromEntries(
      kServerTemplates.map(fw => [fw, layout(fw)]),
    )
    expect(actual).toEqual(
      Object.fromEntries(Object.keys(actual).map(key => [key, expected])),
    )
  })

  it('the dependencies point one way', () => {
    // core -> api-v1 -> server. A cycle here is the failure that a package split is meant
    // to prevent: the contract layer reaching for a route, or a version reaching for the
    // host it is mounted by.
    for (const fw of kServerTemplates) {
      const core = readJson(`core/${fw}/package.json`)
      const api = readJson(`api-v1/${fw}/package.json`)
      const server = readJson(`server/${fw}/package.json`)

      expect(core.dependencies?.['api-v1'], `core/${fw}`).toBeUndefined()
      expect(core.dependencies?.server, `core/${fw}`).toBeUndefined()
      expect(api.dependencies?.['core'], `api-v1/${fw}`).eq('workspace:*')
      expect(api.dependencies?.server, `api-v1/${fw}`).toBeUndefined()
      expect(server.dependencies?.['api-v1'], `server/${fw}`).eq('workspace:*')
      expect(server.dependencies?.core, `server/${fw}`).toBeUndefined()
    }
  })
})

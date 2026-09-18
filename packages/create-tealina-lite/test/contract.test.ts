import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * T1 — the cheap "does it actually compile" gate.
 *
 * Copies the shipped contract subtree (types + convention + the marker the demos import
 * + api-v1 demos) into a scratch project and type-checks it. No install and no network:
 * `typescript` comes from the repo
 * root and the framework types from this package's own devDependencies, so this runs in a
 * couple of seconds and is safe to leave on by default.
 *
 * `probe.ts` does not merely import the projections — it asserts them. Without those
 * assertions this test would be a false green, because `ExtractApiType` can degrade to
 * `never` without a single compiler error. See the `@ts-expect-error` directives below:
 * if the projections stop being concrete, those directives go unused and TypeScript
 * reports TS2578.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgDir = path.resolve(here, '..')
const repoRoot = path.resolve(pkgDir, '../..')
const templateDir = path.join(pkgDir, 'template')
const fixtureRoot = path.join(pkgDir, 'temp/contract')

const tscBin = path.join(repoRoot, 'node_modules/.bin/tsc')
const utilityTypesSrc = path.join(repoRoot, 'packages/utility-types/index.ts')

const FRAMEWORKS = ['express', 'fastify', 'koa'] as const
type Framework = (typeof FRAMEWORKS)[number]

const PROBE = `import type { ApiTypesForClient, ApiTypesForDoc } from './types/api-v1.js'

type Doc = ApiTypesForDoc['get']['/health']
export const docOk: Doc['response'] = { isOk: true }
// @ts-expect-error response is { isOk: boolean }
export const docBad: Doc['response'] = { isOk: 'nope' }

type Client = ApiTypesForClient['post']['/login']
export const loginOk: Client['body'] = { account: 'a', password: 'b' }
// @ts-expect-error password is required
export const loginBad: Client['body'] = { account: 'a' }

// The authed POST is the only demo carrying a request body *and* a typed response,
// so it has to be asserted on both projections. Delete get/status without this and
// the AuthedHandler usage ships with no coverage at all.
type NewArticle = ApiTypesForClient['post']['/article']
export const articleOk: NewArticle['body'] = { title: 't', content: 'c' }
// @ts-expect-error content is required
export const articleBad: NewArticle['body'] = { title: 't' }
// @ts-expect-error id is a number
export const articleRespBad: NewArticle['response'] = { id: 'nope' }

type ArticleDoc = ApiTypesForDoc['post']['/article']
export const articleDoc: ArticleDoc['response'] = { id: 1 }
`

const fixtureTsconfig = {
  compilerOptions: {
    target: 'ES2023',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    esModuleInterop: true,
    skipLibCheck: true,
    noEmit: true,
    baseUrl: '.',
    // Point at the source so this test does not depend on `pnpm build` having run first.
    paths: { '@tealina/utility-types': [utilityTypesSrc] },
  },
  include: ['types/**/*.d.ts', 'src/**/*.ts', 'probe.ts'],
}

function buildFixture(fw: Framework) {
  const dest = path.join(fixtureRoot, fw)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true })

  const copyInto = (src: string, destDir: string) =>
    fs.cpSync(src, destDir, { recursive: true })

  copyInto(path.join(templateDir, 'common/types'), path.join(dest, 'types'))
  copyInto(
    path.join(templateDir, `server/${fw}/types`),
    path.join(dest, 'types'),
  )
  copyInto(
    path.join(templateDir, `server/${fw}/src/api-v1`),
    path.join(dest, 'src/api-v1'),
  )
  fs.copyFileSync(
    path.join(templateDir, `server/${fw}/src/convention.ts`),
    path.join(dest, 'src/convention.ts'),
  )
  // The demos import the public-route marker from here. Only `openHandler` comes along:
  // it is self-contained, while its neighbour `verifyToken` belongs to the running app
  // (it needs `formatErrorResponse`), and this fixture is the contract layer, not the app.
  copyInto(
    path.join(
      templateDir,
      `server/${fw}/src/app/middlewares/auth/openHandler.ts`,
    ),
    path.join(dest, 'src/app/middlewares/auth/openHandler.ts'),
  )

  // Load-bearing: without `"type": "module"` the compiler treats these files as CommonJS
  // and `esModuleInterop` synthesises an extra `default` level around every dynamic
  // import. The contract still compiles, but every projection silently resolves one level
  // too deep and `ExtractApiType` degrades to `never`. Removing this line makes this test
  // fail in exactly the way it is meant to catch.
  fs.writeFileSync(
    path.join(dest, 'package.json'),
    JSON.stringify(
      { name: `contract-${fw}`, private: true, type: 'module' },
      null,
      2,
    ),
  )
  fs.writeFileSync(path.join(dest, 'probe.ts'), PROBE)
  fs.writeFileSync(
    path.join(dest, 'tsconfig.json'),
    JSON.stringify(fixtureTsconfig, null, 2),
  )
  fs.symlinkSync(
    path.join(pkgDir, 'node_modules'),
    path.join(dest, 'node_modules'),
  )

  return dest
}

const clean = () => {
  beforeAll(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true })
  })
}
clean()

describe('shipped contract layer type-checks', () => {
  it('has the compiler and utility-types source where we expect them', () => {
    expect(fs.existsSync(tscBin), `missing tsc at ${tscBin}`).toBe(true)
    expect(fs.existsSync(utilityTypesSrc), `missing ${utilityTypesSrc}`).toBe(
      true,
    )
  })

  for (const fw of FRAMEWORKS) {
    it(`${fw}: types + convention + api-v1 compile and project correctly`, () => {
      const dest = buildFixture(fw)
      const res = spawnSync(tscBin, ['-p', 'tsconfig.json'], {
        cwd: dest,
        encoding: 'utf-8',
      })
      const output = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
      expect(output, `tsc reported:\n${output}`).toBe('')
      expect(res.status, `tsc exited ${res.status}:\n${output}`).toBe(0)
    })
  }
})

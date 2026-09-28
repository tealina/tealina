import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vite-plus/test'
import { type ServerTemplate, kServerTemplates } from '../src/core.js'
import { type Mode, initFiles, webHostFiles } from '../src/template-manifest.js'
import { PROBE_JS, WIDENED_CONVENTION } from './probe.js'

/**
 * T5 — `init` against a project that already exists, in both modes.
 *
 * The scaffold path is covered by T1-T3; what is new here is the second half of the
 * feature's promise: it installs *around* a host, and the host comes out unchanged. So each
 * framework gets a small but real project — its own entry, its own route, its own
 * `package.json` and `tsconfig.json` — and the assertions are:
 *
 *   a. every path in the manifest lands on disk;
 *   b. the host's own files are byte-identical afterwards (the evidence for 不碰已有源码);
 *   c. the whole thing still type-checks, with `init`'s files in the same compilation;
 *   d. running it a second time refuses and writes nothing.
 *
 * The host is the same project in both modes with the same routes, spelled in each
 * language. That is the point of the second arm: 完整 JS 模式 claims a JavaScript host
 * needs no TypeScript toolchain, and (c) is where that claim either holds or does not.
 * It has already earned its keep — the express JavaScript tree type-checked in the
 * template's own gate and failed here, in a host, with TS2355 on every synchronous
 * middleware, because `@types/express-serve-static-core` changed `RequestHandler`'s return
 * to `unknown`. `setupApiHeaders` in `template/server/express-js/src/app/routes/api/index.js`
 * is that case, still written in the cast form that compiles.
 *
 * No install and no network, same as T1: `tsc` comes from this package's own devDependencies
 * — the version the template pins, see T1 — the framework types and their router/static
 * helpers from the same place (symlinked in), and the workspace packages the copied source
 * imports are `paths`-mapped to their sources so the gate does not depend on `pnpm build`
 * having run.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgDir = path.resolve(here, '..')
const repoRoot = path.resolve(pkgDir, '../..')
const templateDir = path.join(pkgDir, 'template')
const fixtureRoot = path.join(pkgDir, 'temp/init')

const tscBin = path.join(pkgDir, 'node_modules/.bin/tsc')
const tsxBin = path.join(pkgDir, 'node_modules/.bin/tsx')

const MODES: Mode[] = ['ts', 'js']
const ext = (mode: Mode) => (mode === 'js' ? 'js' : 'ts')

/**
 * The copied source imports four workspace packages. Mapped to their sources rather than
 * their `dist/` — `dist` is gitignored, and T1 set the precedent: this gate must not need a
 * build to have run. Their sources are self-contained enough for that to work.
 */
const workspacePaths: Record<string, string[]> = {
  '@tealina/utility-types': [
    path.join(repoRoot, 'packages/utility-types/index.ts'),
  ],
  // The contract layer takes the utility types it is built from through here rather than
  // from `@tealina/utility-types` directly, so that a generated project installs one
  // package to compile itself instead of two. Mapped to the re-export's source, so this
  // gate still needs no build of `tealina`.
  'tealina/utility-types': [
    path.join(repoRoot, 'packages/tealina/src/utility-types.ts'),
  ],
  '@tealina/doc-types': [
    path.join(repoRoot, 'packages/tealina-doc-types/index.ts'),
  ],
  '@tealina/server': [
    path.join(repoRoot, 'packages/tealina-server/src/index.ts'),
  ],
  '@tealina/doc-ui': [
    path.join(repoRoot, 'packages/tealina-doc-ui/src/index.ts'),
  ],
}

/**
 * `tealina.config.ts` is the one file in the manifest this gate does not compile, and the
 * reason is worth writing down rather than leaving as a gap someone re-discovers. It is the
 * same reason in both modes: it imports `tealina` — the CLI package — and nothing else.
 * `packages/tealina`'s source is the one workspace package that cannot stand in for the
 * installed build: it reaches into `./utils/*` without file extensions, which its bundler
 * accepts and `NodeNext` rejects. Checking the file would mean either depending on
 * `pnpm build` or hand-writing a fake `tealina` module, and neither is worth it: whether
 * this file compiles is a question about the host having installed `tealina`, not about
 * `init`. It is copied byte-for-byte from the template, the manifest test asserts it is in
 * the set, and T3 compiles it for real after an install. Hence `include` below: it covers
 * `types/**` and `src/**` and nothing else, so the bare `tealina` needs no mapping here.
 * The one file in that set which reaches into the package is the contract layer, and it
 * takes a subpath rather than the entry — see `'tealina/utility-types'` above.
 */

/** The runtime package `init` looks for to detect the framework. */
const frameworkPkg: Record<ServerTemplate, string> = {
  express: 'express',
  fastify: 'fastify',
  koa: 'koa',
}

/**
 * A host project's own source. Deliberately plain — the point is not that these are good
 * routes, it is that `init` does not touch them.
 *
 * The JavaScript spelling is the honest test of (c): `checkJs` is on, so anything the
 * template gets wrong about JSDoc inference shows up here rather than in a user's editor.
 */
const kHostSource: Record<
  Mode,
  Record<ServerTemplate, Record<string, string>>
> = {
  ts: {
    express: {
      'src/index.ts': `import express from 'express'
import { usersRouter } from './routes/users.js'

const app = express()
app.use('/users', usersRouter)
app.listen(3000)
`,
      'src/routes/users.ts': `import { Router } from 'express'

export const usersRouter = Router().get('/', (_req, res) => {
  res.json([{ id: 1 }])
})
`,
    },
    koa: {
      'src/index.ts': `import Koa from 'koa'
import { usersRouter } from './routes/users.js'

const app = new Koa()
app.use(usersRouter.routes())
app.listen(3000)
`,
      'src/routes/users.ts': `import Router from '@koa/router'

export const usersRouter = new Router().get('/', ctx => {
  ctx.body = [{ id: 1 }]
})
`,
    },
    fastify: {
      'src/index.ts': `import fastify from 'fastify'
import { registerUsers } from './routes/users.js'

const app = fastify()
await app.register(registerUsers)
app.listen({ port: 3000 })
`,
      'src/routes/users.ts': `import type { FastifyInstance } from 'fastify'

export const registerUsers = async (app: FastifyInstance) => {
  app.get('/users', async () => [{ id: 1 }])
}
`,
    },
  },
  js: {
    express: {
      'src/index.js': `import express from 'express'
import { usersRouter } from './routes/users.js'

const app = express()
app.use('/users', usersRouter)
app.listen(3000)
`,
      'src/routes/users.js': `import { Router } from 'express'

export const usersRouter = Router().get('/', (_req, res) => {
  res.json([{ id: 1 }])
})
`,
    },
    koa: {
      'src/index.js': `import Koa from 'koa'
import { usersRouter } from './routes/users.js'

const app = new Koa()
app.use(usersRouter.routes())
app.listen(3000)
`,
      'src/routes/users.js': `import Router from '@koa/router'

export const usersRouter = new Router().get('/', ctx => {
  ctx.body = [{ id: 1 }]
})
`,
    },
    fastify: {
      'src/index.js': `import fastify from 'fastify'
import { registerUsers } from './routes/users.js'

const app = fastify()
await app.register(registerUsers)
app.listen({ port: 3000 })
`,
      'src/routes/users.js': `/** @param {import('fastify').FastifyInstance} app */
export const registerUsers = async app => {
  app.get('/users', async () => [{ id: 1 }])
}
`,
    },
  },
}

const hostTsconfig = (mode: Mode) => ({
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
    // `paths` resolves against this tsconfig on its own; TS 6 rejects `baseUrl` (TS5101).
    paths: workspacePaths,
    // The whole difference between the two hosts: in JavaScript mode the compiler is
    // reading the project, not building it, and `allowJs` is what makes it resolve a
    // `.js` specifier at all. Without it every import in the copied tree is TS2307.
    ...(mode === 'js' ? { allowJs: true, checkJs: true } : {}),
  },
  // No `tealina.config.*` — see the note above. `probe.<ext>` is listed from the start and
  // only exists in the fixture that wants it; a pattern matching nothing is not an error.
  include:
    mode === 'js'
      ? ['types/**/*.d.ts', 'src/**/*.js', 'probe.js']
      : ['types/**/*.d.ts', 'src/**/*.ts', 'probe.ts'],
})

const write = (file: string, content: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

/** Every file under `dir`, keyed by relative path. Skips the `node_modules` symlink. */
const snapshot = (dir: string): Record<string, string> => {
  const out: Record<string, string> = {}
  const walk = (rel: string) => {
    for (const entry of fs.readdirSync(path.join(dir, rel), {
      withFileTypes: true,
    })) {
      if (entry.name === 'node_modules') continue
      const child = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) walk(child)
      else out[child] = fs.readFileSync(path.join(dir, child), 'utf-8')
    }
  }
  walk('')
  return out
}

const runInit = (
  dir: string,
  fw: ServerTemplate,
  mode: Mode,
  flags: string[] = [],
) =>
  spawnSync(
    tsxBin,
    [
      'src/index.ts',
      'init',
      dir,
      '--template',
      fw,
      ...(mode === 'js' ? ['--js'] : []),
      ...flags,
    ],
    { cwd: pkgDir, encoding: 'utf-8' },
  )

const runTsc = (dir: string) => {
  const res = spawnSync(tscBin, ['-p', 'tsconfig.json'], {
    cwd: dir,
    encoding: 'utf-8',
  })
  return `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
}

/**
 * A host project on disk: its own entry, its own route, its own manifest and tsconfig.
 *
 * `extra` is for the one host that differs — the one `--web` needs, which publishes its
 * contract through an `exports` map where the others deliberately have none.
 */
const writeHost = (
  dir: string,
  fw: ServerTemplate,
  mode: Mode,
  extra: Record<string, unknown> = {},
) => {
  write(
    path.join(dir, 'package.json'),
    `${JSON.stringify(
      {
        name: `existing-${fw}-api`,
        private: true,
        type: 'module',
        // Pinned, not a range: the merge must leave a version it finds exactly as it is,
        // and an exact string is the only spelling where that is observable.
        dependencies: { [frameworkPkg[fw]]: '5.1.0' },
        scripts: {
          start: mode === 'js' ? 'node src/index.js' : 'node dist/index.js',
        },
        ...extra,
      },
      null,
      2,
    )}\n`,
  )
  write(
    path.join(dir, 'tsconfig.json'),
    `${JSON.stringify(hostTsconfig(mode), null, 2)}\n`,
  )
  for (const [rel, content] of Object.entries(kHostSource[mode][fw])) {
    write(path.join(dir, rel), content)
  }
  fs.symlinkSync(
    path.join(pkgDir, 'node_modules'),
    path.join(dir, 'node_modules'),
  )
}

type Fixture = {
  dir: string
  /** The host files as they were written, for the byte-identity assertion. */
  before: Record<string, string>
  /** Everything on disk right after a successful `init`. */
  after: Record<string, string>
  stdout: string
}

const fixtures = new Map<string, Fixture>()

/**
 * Built once per framework and mode and reused by the assertions below — `init` is a
 * subprocess, and running it once per assertion would only re-test the first run.
 *
 * `probe` additionally installs the demo endpoints on top of what `init` wrote, the way
 * `align` will after the user's first real endpoint, plus a probe that asserts their
 * derived types. It lives in its own directory because it adds files the byte-identity
 * assertion counts.
 */
const prepared = (fw: ServerTemplate, mode: Mode, probe = false): Fixture => {
  const key = `${fw}-${mode}${probe ? '-probe' : ''}`
  const cached = fixtures.get(key)
  if (cached != null) return cached

  const dir = path.join(fixtureRoot, key)
  fs.rmSync(dir, { recursive: true, force: true })
  writeHost(dir, fw, mode)

  const before = snapshot(dir)
  const res = runInit(dir, fw, mode)
  const stdout = `${res.stdout ?? ''}${res.stderr ?? ''}`
  expect(res.status, `init exited ${res.status}:\n${stdout}`).toBe(0)

  if (probe) {
    // `init` deliberately writes an empty route table — a demo endpoint dropped into a
    // project that already has routes is a route nobody asked for. So the demo set comes
    // from the template, exactly as `create` would have shipped it, and this becomes the
    // installed copy the projection is asserted against.
    const tree = mode === 'js' ? `server/${fw}-js` : `server/${fw}`
    fs.cpSync(
      path.join(templateDir, tree, 'src/api-v1'),
      path.join(dir, 'src/api-v1'),
      {
        recursive: true,
      },
    )
    write(path.join(dir, `probe.${ext(mode)}`), PROBE_JS)
  }

  const fixture: Fixture = { dir, before, after: snapshot(dir), stdout }
  fixtures.set(key, fixture)
  return fixture
}

// The fixture root is wiped once, before any of them exist. Nothing else may delete it:
// a shared `rmSync` in a per-framework hook would take the other framework's directory
// with it.
beforeAll(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
})

describe('init into an existing project', () => {
  for (const mode of MODES) {
    for (const fw of kServerTemplates) {
      it(`${fw} (${mode}): writes the manifest and leaves the host's files byte-identical`, () => {
        const { before, after } = prepared(fw, mode)

        const missing = initFiles(fw, mode)
          .map(f => f.dest)
          .filter(dest => after[dest] == null)
        expect(missing).toEqual([])
        expect(after[`src/api-v1/index.${ext(mode)}`]).toBe(
          'export default {}\n',
        )

        // The whole promise of the feature, in one assertion. `init` may add files and edit
        // `package.json`; anything else that differs is it having reached into the host.
        const changed = Object.entries(before)
          .filter(
            ([rel, content]) =>
              rel !== 'package.json' && after[rel] !== content,
          )
          .map(([rel]) => rel)
        expect(changed, 'host files init modified').toEqual([])
        expect(
          Object.keys(after).length - Object.keys(before).length,
          'files added',
        ).toBe(initFiles(fw, mode).length + 1)

        if (mode === 'js') {
          // A `.ts` source would be a file nothing in this project runs and nothing
          // checks: the host's compiler is configured for `.js`, and node never loads it.
          // `.d.ts` stays — it is a type file in both modes, and the two share one copy.
          const strays = Object.keys(after).filter(
            rel =>
              before[rel] == null &&
              /\.tsx?$/.test(rel) &&
              !rel.endsWith('.d.ts'),
          )
          expect(
            strays,
            'TypeScript sources written into a JavaScript project',
          ).toEqual([])
        }
      })

      it(`${fw} (${mode}): merges package.json without taking anything over`, () => {
        const pkg = JSON.parse(
          fs.readFileSync(
            path.join(prepared(fw, mode).dir, 'package.json'),
            'utf-8',
          ),
        ) as Record<string, Record<string, string>>

        // Kept, not replaced by the template's range.
        expect(pkg.dependencies[frameworkPkg[fw]]).toBe('5.1.0')
        for (const name of ['@tealina/server', '@tealina/doc-ui']) {
          expect(pkg.dependencies[name], name).toBeDefined()
        }
        // `tealina` is what the copied contract layer imports its utility types from, so
        // it is the one dependency whose presence here is load-bearing. There used to be a
        // second name checked beside it, `@tealina/utility-types`.
        expect(pkg.devDependencies.tealina).toBeDefined()
        expect(pkg.devDependencies['@tealina/utility-types']).toBeUndefined()

        // The toolchain is the host's call — `init` reports it rather than swapping their
        // compiler or runner out from under them. `typescript` is the exception, and only
        // in JavaScript mode: there it is not a compiler (nothing is compiled) but a hard
        // peerDependency of `tealina`, because `gdoc` reads the sources through the
        // compiler API. Skipping it would install a convention whose `gdoc` cannot start.
        expect(pkg.devDependencies.tsx).toBeUndefined()
        if (mode === 'js') {
          expect(pkg.devDependencies.typescript).toBeDefined()
        } else {
          expect(pkg.devDependencies.typescript).toBeUndefined()
        }

        expect(pkg.scripts.start).toBe(
          mode === 'js' ? 'node src/index.js' : 'node dist/index.js',
        )
        for (const name of ['v1', 'gdoc', 'align']) {
          expect(pkg.scripts[name], name).toContain('src/api-v1')
          if (mode === 'js') {
            // There is no `tealina.config.ts` here for the commands to find by default.
            expect(pkg.scripts[name], name).toContain('tealina.config.js')
          }
        }

        // A package with no `exports` map must not gain one: creating it seals every other
        // deep import the host used to allow.
        expect(pkg.exports).toBeUndefined()
      })

      it(`${fw} (${mode}): the result type-checks next to the host's own source`, () => {
        const { dir } = prepared(fw, mode)
        const output = runTsc(dir)
        expect(output, `tsc reported:\n${output}`).toBe('')
      })

      it(`${fw} (${mode}): a second run refuses and writes nothing`, () => {
        const { dir, after } = prepared(fw, mode)
        const res = runInit(dir, fw, mode)
        const output = `${res.stdout ?? ''}${res.stderr ?? ''}`

        expect(res.status, `expected a non-zero exit:\n${output}`).toBe(1)
        expect(output).toContain('already has')
        expect(snapshot(dir)).toEqual(after)
      })
    }
  }

  // The JavaScript-only arm, and the reason it exists is that T1 can only ever prove the
  // *template's* convention projects correctly. What `init` installs is a copy, in a
  // directory the test did not choose, beside a host that may already have its own idea of
  // what `src/convention.js` is. So: break the installed copy, and insist the probe — which
  // is checking types derived from that copy, through the host's own tsconfig — notices.
  for (const fw of kServerTemplates) {
    it(`${fw} (js): the installed convention is what the projection reads`, () => {
      const { dir } = prepared(fw, 'js', true)

      // Control first, and it is not ceremony: the demo endpoints and the probe are written
      // by this test, so a probe that was broken from the start would also produce an error
      // after the mutation, and the assertion below would read green while proving nothing.
      const clean = runTsc(dir)
      expect(
        clean,
        `the probe did not compile against the installed template:\n${clean}`,
      ).toBe('')

      fs.writeFileSync(path.join(dir, 'src/convention.js'), WIDENED_CONVENTION)
      const broken = runTsc(dir)
      // Named precisely, not just `toContain('TS2322')`: the failure has to be the probe
      // lines degrading to `never`, one per assertion in `PROBE_JS`. A diagnostic from
      // anywhere else in the fixture would satisfy the loose form and prove nothing about
      // the installed convention.
      const degraded = broken
        .split('\n')
        .filter(line => line.includes('probe.js') && line.includes("'never'"))
      expect(
        degraded.length,
        'the probe compiled against a deliberately widened convention — the copy `init` ' +
          `installed is not the one the projection reads:\n${broken}`,
      ).toBe(PROBE_JS.match(/@type \{/g)?.length)
    })
  }
})

// ---------------------------------------------------------------------------
// T5, second half: the frontend
// ---------------------------------------------------------------------------

const hostNameOf = (fw: ServerTemplate) => `existing-${fw}-api`

// The two packages the fixtures below reach past npm for, standing in for something a user
// installs rather than something this repo ships as source.
//
// Everything else in these fixtures is `paths`-mapped to `src/` so the gate needs no build.
// Not these: what the frontend reaches is a published package resolved through an `exports`
// map, and the witness it carries is only meaningful as what that map hands back. Mapping it
// to `src/` would test a resolution nobody runs. Both are built in `global-setup.ts`, once,
// above the workers — see the note there for why the build cannot be lazy per test file.
//
// `tealina` is in that list one step further in than the client: the contract layer takes its
// utility types through `tealina/utility-types`, which is an `exports` entry and a `.d.ts`
// under that package's `dist/`, so the fixture has to resolve the real thing and not a
// mapping of it. Unlike `paths`, a broken resolution here is silent — the import sits in a
// `.d.ts`, where every gate in this repo sets `skipLibCheck`, and the projection widens to
// `any` instead of failing. That is why the mutation below, and not the compile above it, is
// the test that matters.

type WebFixture = {
  hostDir: string
  webDir: string
  hostBefore: Record<string, string>
  tsc: () => string
}

const webFixtures = new Map<string, WebFixture>()

/**
 * A page that reads one field off one response, and nothing else.
 *
 * The installed `src/main.*` deliberately calls nothing: `init` copies no demo endpoints,
 * so a call to `/health` would not compile in the project it lands in. That leaves the
 * projection with no reader in the host's own tree, and a mutation with nothing to break —
 * so this stands in for the first call a user writes. It is the same species as
 * `probe.<ext>` in the server fixtures above, and it is thrown away with the fixture.
 */
const kWebProbe: Record<Mode, string> = {
  ts: `import { req } from './api/client'

export const probe = async () => {
  const health = await req.get('health')
  const isOk: boolean = health.isOk
  return isOk
}
`,
  js: `import { req } from './api/client'

export const probe = async () => {
  const health = await req.get('health')
  /** @type {boolean} */
  const isOk = health.isOk
  return isOk
}
`,
}

/**
 * A host that publishes its contract (the one difference from the hosts above — they have
 * deliberately no `exports` at all), with `init --web` run against it.
 *
 * `probe` installs the template's demo endpoints over the empty `src/api-v1/index.<ext>`
 * that `init` writes, plus the reader above. It is the same move `prepared(..., probe)`
 * makes and for the same reason: the projection needs something to project, and the
 * mutation needs a call site to break.
 */
const preparedWeb = (
  fw: ServerTemplate,
  mode: Mode,
  probe = false,
): WebFixture => {
  const key = `${fw}-${mode}${probe ? '-probe' : ''}`
  const cached = webFixtures.get(key)
  if (cached != null) return cached

  const root = path.join(fixtureRoot, `web-${key}`)
  const hostDir = path.join(root, 'host')
  fs.rmSync(root, { recursive: true, force: true })
  writeHost(hostDir, fw, mode, {
    exports: { './api/v1': { types: './types/api-v1.d.ts' } },
  })

  const hostBefore = snapshot(hostDir)
  const res = runInit(hostDir, fw, mode, ['--web'])
  const output = `${res.stdout ?? ''}${res.stderr ?? ''}`
  expect(res.status, `init --web exited ${res.status}:\n${output}`).toBe(0)

  const webDir = path.join(root, 'web')
  if (probe) {
    fs.cpSync(
      path.join(
        templateDir,
        mode === 'js' ? `server/${fw}-js` : `server/${fw}`,
        'src/api-v1',
      ),
      path.join(hostDir, 'src/api-v1'),
      { recursive: true },
    )
    write(path.join(webDir, `src/probe.${ext(mode)}`), kWebProbe[mode])
  }

  // The workspace links an install would make, made by hand — there is no install here.
  // The first is the host under its *own* name, which is what makes the specifier rewrite
  // load-bearing rather than cosmetic; the second is the client.
  //
  // The host's other dependencies need no line here: `writeHost` points its
  // `node_modules` at this package's own, where every dependency the templates declare is
  // a devDependency — `tealina` included, which is what the contract layer resolves
  // `tealina/utility-types` through.
  const webModules = path.join(webDir, 'node_modules')
  fs.mkdirSync(path.join(webModules, '@tealina'), { recursive: true })
  fs.symlinkSync(hostDir, path.join(webModules, hostNameOf(fw)))
  fs.symlinkSync(
    path.join(repoRoot, 'packages/tealina-client'),
    path.join(webModules, '@tealina/client'),
  )

  // The tsconfig `init` wrote, with one line changed: `vite.config.*` is not compiled.
  // There is no `vite` here to resolve it — only a real install has one — and the import
  // would fail for a reason that says nothing about `init`. Narrowing `include` to `src`
  // keeps every other option exactly as shipped, and keeps this gate on the files that
  // carry the types. T3 compiles the package whole, after an install.
  //
  // Edited as text rather than parsed: the shipped file carries comments, which is the
  // form a person reads and edits in their own project.
  const tsconfigPath = path.join(webDir, 'tsconfig.json')
  const shipped = fs.readFileSync(tsconfigPath, 'utf-8')
  const narrowed = shipped.replace(
    /"include":\s*\[[^\]]*\]/,
    '"include": ["src"]',
  )
  expect(narrowed, 'the template tsconfig has no `include` to narrow').not.toBe(
    shipped,
  )
  fs.writeFileSync(tsconfigPath, narrowed)

  const fixture: WebFixture = {
    hostDir,
    webDir,
    hostBefore,
    tsc: () => runTsc(webDir),
  }
  webFixtures.set(key, fixture)
  return fixture
}

describe('init --web', () => {
  for (const mode of MODES) {
    for (const fw of kServerTemplates) {
      it(`${fw} (${mode}): writes the frontend beside the host`, () => {
        const { hostDir, webDir, hostBefore } = preparedWeb(fw, mode)

        expect(path.dirname(webDir)).toBe(path.dirname(hostDir))
        const after = snapshot(webDir)
        const missing = webHostFiles(mode)
          .map(f => f.dest)
          .filter(dest => after[dest] == null)
        expect(
          missing,
          'web files the manifest names but init did not write',
        ).toEqual([])
        expect(Object.keys(after).length).toBe(webHostFiles(mode).length)

        // The promise `init` has always made, extended to the package next door rather
        // than relaxed by it.
        const hostAfter = snapshot(hostDir)
        const changed = Object.entries(hostBefore)
          .filter(
            ([rel, content]) =>
              rel !== 'package.json' && hostAfter[rel] !== content,
          )
          .map(([rel]) => rel)
        expect(changed, 'host files init --web modified').toEqual([])
      })

      it(`${fw} (${mode}): names the host package, not the template's placeholder`, () => {
        const { webDir } = preparedWeb(fw, mode)
        const client = fs.readFileSync(
          path.join(webDir, `src/api/client.${ext(mode)}`),
          'utf-8',
        )
        // A host called `server` would make this rewrite invisible. This one is not.
        expect(client).toContain(`${hostNameOf(fw)}/api/v1`)
        expect(client).not.toContain('server/api/v1')

        const pkg = JSON.parse(
          fs.readFileSync(path.join(webDir, 'package.json'), 'utf-8'),
        ) as {
          name: string
          dependencies: Record<string, string>
          devDependencies: Record<string, string>
        }
        expect(pkg.name).toBe('web')
        // A devDependency because it is reached for its types and nothing else: the
        // `.d.ts` comes through its `exports` map, and no runtime code imports it.
        expect(pkg.devDependencies[hostNameOf(fw)]).toBe('workspace:*')
        expect(pkg.devDependencies.server).toBeUndefined()
        expect(pkg.dependencies['@tealina/client']).toBeDefined()
      })

      it(`${fw} (${mode}): the frontend compiles against the host's contract`, () => {
        const { hostDir, tsc } = preparedWeb(fw, mode)

        // Nothing has a route yet — `init` copies no demo endpoints into a host, which is
        // the state this arm is about. The frontend survives it because `src/main.*` calls
        // nothing; and it still proves the arrangement, because the contract import in
        // `src/api/client.*` resolved. An `exports` map that did not reach the host's
        // `.d.ts` would be TS2307 here rather than silence.
        expect(
          fs
            .readFileSync(
              path.join(hostDir, 'src/api-v1', `index.${ext(mode)}`),
              'utf-8',
            )
            .trim(),
          'init did not leave the host with an empty route table',
        ).toBe('export default {}')

        const output = tsc()
        expect(output, `tsc reported:\n${output}`).toBe('')
      })

      it(`${fw} (${mode}): renaming a response field breaks the frontend`, () => {
        const { hostDir, tsc } = preparedWeb(fw, mode, true)

        // Control first, for the same reason as the probe above: a frontend that was
        // broken from the start would report an error after the mutation too.
        const clean = tsc()
        expect(
          clean,
          `the frontend did not compile against the installed host:\n${clean}`,
        ).toBe('')

        // The claim the whole feature rests on, in one edit. The handler's annotation is
        // the only place the response shape is written down; the client derives it. Rename
        // the field in both halves of that one file and the frontend stops compiling —
        // nothing on the client side mentions `isOk` except the line reading it.
        const health = path.join(
          hostDir,
          'src/api-v1/get',
          `health.${ext(mode)}`,
        )
        const original = fs.readFileSync(health, 'utf-8')
        fs.writeFileSync(health, original.replaceAll('isOk', 'ok'))

        const broken = tsc()
        fs.writeFileSync(health, original)

        // Named, not just "something failed": the diagnostic has to be in the file that
        // reads the response, and not merely somewhere in the program. A `tsc` that failed
        // in the host's own tree, for instance, would say nothing about the frontend.
        const noticed = broken
          .split('\n')
          .filter(line => line.startsWith(`src/probe.`))
        expect(
          noticed.length,
          `the frontend compiled against a renamed response field:\n${broken}`,
        ).not.toBe(0)
      })
    }
  }

  it('refuses when a frontend is already next door, before writing anything', () => {
    const root = path.join(fixtureRoot, 'web-conflict')
    const hostDir = path.join(root, 'host')
    fs.rmSync(root, { recursive: true, force: true })
    writeHost(hostDir, 'express', 'ts', {
      exports: { './api/v1': { types: './types/api-v1.d.ts' } },
    })
    // Someone's own frontend, already beside the host.
    write(path.join(root, 'web/package.json'), '{\n  "name": "web"\n}\n')

    const before = snapshot(hostDir)
    const res = runInit(hostDir, 'express', 'ts', ['--web'])
    const output = `${res.stdout ?? ''}${res.stderr ?? ''}`

    expect(res.status, `expected a non-zero exit:\n${output}`).toBe(1)
    expect(output).toContain('already has')
    expect(output).toContain(`${path.sep}web`)
    // Both halves, and this is the assertion worth having: the conflict in the package next
    // door stops the command *before* the server half lands, rather than being discovered
    // after half the install is on disk.
    expect(snapshot(hostDir), 'the host was written to').toEqual(before)
    expect(Object.keys(snapshot(path.join(root, 'web')))).toEqual([
      'package.json',
    ])
  })

  it('withholds the frontend from a package that publishes no contract', () => {
    const root = path.join(fixtureRoot, 'web-no-exports')
    const hostDir = path.join(root, 'host')
    fs.rmSync(root, { recursive: true, force: true })
    writeHost(hostDir, 'express', 'ts')

    const res = runInit(hostDir, 'express', 'ts', ['--web'])
    const output = `${res.stdout ?? ''}${res.stderr ?? ''}`

    // The server half still installs. Only the frontend is withheld, and it is withheld
    // rather than written broken: without `exports["./api/v1"]` the one import that gives
    // the package its types resolves to nothing, and what would land is a Vite app whose
    // client types nothing at all — the failure this feature exists to prevent.
    expect(res.status, `init --web exited ${res.status}:\n${output}`).toBe(0)
    expect(fs.existsSync(path.join(hostDir, 'src/convention.ts'))).toBe(true)
    expect(output).toContain('--web skipped')
    expect(output).toContain('"./api/v1"')
    expect(fs.existsSync(path.join(root, 'web'))).toBe(false)
  })
})

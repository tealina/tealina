import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { type ServerTemplate, kServerTemplates } from '../src/core.js'
import { initFiles } from '../src/init.js'

/**
 * T5 — `init` against a project that already exists.
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
 * No install and no network, same as T1: `tsc` comes from the repo root, the framework types
 * and their router/static helpers from this package's devDependencies (symlinked in), and
 * the workspace packages the copied source imports are `paths`-mapped to their sources so
 * the gate does not depend on `pnpm build` having run.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgDir = path.resolve(here, '..')
const repoRoot = path.resolve(pkgDir, '../..')
const fixtureRoot = path.join(pkgDir, 'temp/init')

const tscBin = path.join(repoRoot, 'node_modules/.bin/tsc')
const tsxBin = path.join(pkgDir, 'node_modules/.bin/tsx')

/**
 * The copied source imports four workspace packages. Mapped to their sources rather than
 * their `dist/` — `dist` is gitignored, and T1 set the precedent: this gate must not need a
 * build to have run. Their sources are self-contained enough for that to work.
 */
const workspacePaths: Record<string, string[]> = {
  '@tealina/utility-types': [
    path.join(repoRoot, 'packages/utility-types/index.ts'),
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
 * reason is worth writing down rather than leaving as a gap someone re-discovers.
 *
 * It imports `tealina` — the CLI package — and nothing else. `packages/tealina`'s source is
 * the one workspace package that cannot stand in for the installed build: it reaches into
 * `./utils/*` without file extensions, which its bundler accepts and `NodeNext` rejects.
 * Checking the file would mean either depending on `pnpm build` or hand-writing a fake
 * `tealina` module, and neither is worth it: whether this file compiles is a question about
 * the host having installed `tealina`, not about `init`. It is copied byte-for-byte from
 * the template, the manifest test asserts it is in the set, and T3 compiles it for real
 * after an install. Hence `include` below: it covers `types/**` and `src/**` and nothing
 * else, which is why the fixture needs no `tealina` mapping.
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
 */
const hostSource: Record<ServerTemplate, Record<string, string>> = {
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
}

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

const runInit = (dir: string, fw: ServerTemplate) =>
  spawnSync(tsxBin, ['src/index.ts', 'init', dir, '--template', fw], {
    cwd: pkgDir,
    encoding: 'utf-8',
  })

type Fixture = {
  dir: string
  /** The host files as they were written, for the byte-identity assertion. */
  before: Record<string, string>
  /** Everything on disk right after a successful `init`. */
  after: Record<string, string>
  stdout: string
}

const fixtures = new Map<ServerTemplate, Fixture>()

/**
 * Built once per framework and reused by the three assertions below — `init` is a
 * subprocess, and running it three times would only re-test the first run.
 */
const prepared = (fw: ServerTemplate): Fixture => {
  const cached = fixtures.get(fw)
  if (cached != null) return cached

  const dir = path.join(fixtureRoot, fw)
  fs.rmSync(dir, { recursive: true, force: true })

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
        scripts: { start: 'node dist/index.js' },
      },
      null,
      2,
    )}\n`,
  )
  write(
    path.join(dir, 'tsconfig.json'),
    `${JSON.stringify(
      {
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
          paths: workspacePaths,
        },
        // No `tealina.config.ts` — see the note above.
        include: ['types/**/*.d.ts', 'src/**/*.ts'],
      },
      null,
      2,
    )}\n`,
  )
  for (const [rel, content] of Object.entries(hostSource[fw])) {
    write(path.join(dir, rel), content)
  }
  fs.symlinkSync(
    path.join(pkgDir, 'node_modules'),
    path.join(dir, 'node_modules'),
  )

  const before = snapshot(dir)
  const res = runInit(dir, fw)
  const stdout = `${res.stdout ?? ''}${res.stderr ?? ''}`
  expect(res.status, `init exited ${res.status}:\n${stdout}`).toBe(0)

  const fixture: Fixture = { dir, before, after: snapshot(dir), stdout }
  fixtures.set(fw, fixture)
  return fixture
}

beforeAll(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
})

describe('init into an existing project', () => {
  for (const fw of kServerTemplates) {
    it(`${fw}: writes the manifest and leaves the host's files byte-identical`, () => {
      const { before, after } = prepared(fw)

      const missing = initFiles(fw)
        .map(f => f.dest)
        .filter(dest => after[dest] == null)
      expect(missing).toEqual([])
      expect(after['src/api-v1/index.ts']).toBe('export default {}\n')

      // The whole promise of the feature, in one assertion. `init` may add files and edit
      // `package.json`; anything else that differs is it having reached into the host.
      const changed = Object.entries(before)
        .filter(
          ([rel, content]) => rel !== 'package.json' && after[rel] !== content,
        )
        .map(([rel]) => rel)
      expect(changed, 'host files init modified').toEqual([])
      expect(
        Object.keys(after).length - Object.keys(before).length,
        'files added',
      ).toBe(initFiles(fw).length + 1)
    })

    it(`${fw}: merges package.json without taking anything over`, () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(prepared(fw).dir, 'package.json'), 'utf-8'),
      ) as Record<string, Record<string, string>>

      // Kept, not replaced by the template's range.
      expect(pkg.dependencies[frameworkPkg[fw]]).toBe('5.1.0')
      for (const name of ['@tealina/server', '@tealina/doc-ui']) {
        expect(pkg.dependencies[name], name).toBeDefined()
      }
      expect(pkg.devDependencies['@tealina/utility-types']).toBeDefined()
      expect(pkg.devDependencies.tealina).toBeDefined()

      // The toolchain is the host's call — `init` reports it rather than swapping their
      // compiler or runner out from under them.
      expect(pkg.devDependencies.typescript).toBeUndefined()
      expect(pkg.devDependencies.tsx).toBeUndefined()

      expect(pkg.scripts.start).toBe('node dist/index.js')
      for (const name of ['v1', 'gdoc', 'align']) {
        expect(pkg.scripts[name], name).toContain('src/api-v1')
      }

      // A package with no `exports` map must not gain one: creating it seals every other
      // deep import the host used to allow.
      expect(pkg.exports).toBeUndefined()
    })

    it(`${fw}: the result type-checks next to the host's own source`, () => {
      const { dir } = prepared(fw)
      const res = spawnSync(tscBin, ['-p', 'tsconfig.json'], {
        cwd: dir,
        encoding: 'utf-8',
      })
      const output = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
      expect(output, `tsc reported:\n${output}`).toBe('')
      expect(res.status, `tsc exited ${res.status}:\n${output}`).toBe(0)
    })

    it(`${fw}: a second run refuses and writes nothing`, () => {
      const { dir, after } = prepared(fw)
      const res = runInit(dir, fw)
      const output = `${res.stdout ?? ''}${res.stderr ?? ''}`

      expect(res.status, `expected a non-zero exit:\n${output}`).toBe(1)
      expect(output).toContain('already has')
      expect(snapshot(dir)).toEqual(after)
    })
  }
})

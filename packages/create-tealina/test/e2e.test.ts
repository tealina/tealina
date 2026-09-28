import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it, onTestFailed } from 'vite-plus/test'

/**
 * T3 — the acceptance test: scaffold a real project, install it, compile it, generate
 * its docs, boot it, and talk to it.
 *
 * This is the only test that can see the runtime half of the scaffold. T1 type-checks
 * the contract and the demos; nothing there can observe that express's `verifyToken`
 * actually rejects a request without an Authorization header, or that dropping
 * `catchErrorWrapper` did not turn a handler rejection into a crash.
 *
 * It needs the network (twelve installs — a scaffold and an init fixture for each of three
 * frameworks in each of two modes), so it is gated locally and on in CI. Run it with
 * `TEALINA_E2E=1 pnpm -F create-tealina test`.
 *
 * Everything the demos promise is asserted for all three frameworks, because the whole
 * point of shipping three templates is that they behave the same; and in both modes,
 * because the point of the JavaScript one is that it behaves the same too.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgDir = path.resolve(here, '..')
const repoRoot = path.resolve(pkgDir, '../..')
const tempRoot = path.join(pkgDir, 'temp/e2e')
const cliEntry = path.join(pkgDir, 'src/index.ts')
const tsxBin = path.join(pkgDir, 'node_modules/.bin/tsx')
const tealinaDir = path.join(repoRoot, 'packages/tealina')

const enabled = process.env.TEALINA_E2E === '1' || process.env.CI != null
const describeE2E = enabled ? describe : describe.skip

const FRAMEWORKS = ['express', 'fastify', 'koa'] as const
type Framework = (typeof FRAMEWORKS)[number]

const MODES = ['ts', 'js'] as const
type Mode = (typeof MODES)[number]

const ext = (mode: Mode) => (mode === 'js' ? 'js' : 'ts')

/** The flag that asks for the mode; TypeScript is what you get by saying nothing. */
const modeFlags = (mode: Mode) => (mode === 'js' ? ['--js'] : [])

/** Distinct ports so a leaked server from one block cannot answer for the next. */
const PORT: Record<Mode, Record<Framework, number>> = {
  ts: { express: 8711, fastify: 8712, koa: 8713 },
  js: { express: 8731, fastify: 8732, koa: 8733 },
}

/**
 * The `tealina` every fixture installs, which is the one this repo builds rather than the
 * one on npm.
 *
 * The templates declare `tealina: ^2.2.2`, and that is right for a user — it is the release
 * they will get. It is wrong for this test: `sourceExt`, the flag that makes `align` write
 * `index.js`, is not in any published version, so the JavaScript fixtures would install a
 * CLI that cannot scaffold the project they are asking it for. The override is scoped to the
 * fixture's own workspace file, so the templates are untouched and a real user's install is
 * unaffected.
 *
 * `link:` needs a path relative to the *workspace root*, which is the fixture directory —
 * pnpm rewrites it into `node_modules/` from there.
 */
const tealinaOverride = (projectDir: string, extra: string[] = []) =>
  `\noverrides:\n  tealina: link:${path.relative(projectDir, tealinaDir)}\n` +
  extra.join('')

/**
 * The other dependency a fixture has to reach past npm for, and only the JavaScript
 * frontend does.
 *
 * `createFetchClient`'s second parameter is new in this branch. A JavaScript call site
 * cannot carry type arguments, so the API record is handed over as a value and read only as
 * a type — and the published client has no such parameter. A JavaScript fixture that
 * installed it would be building the tree against a client that cannot build it, which is a
 * fact about the release, not about the template. The TypeScript arm needs no override: it
 * spells the type arguments out, which every published version accepts.
 */
const clientOverride = (projectDir: string) =>
  `  '@tealina/client': link:${path.relative(
    projectDir,
    path.join(repoRoot, 'packages/tealina-client'),
  )}\n`

const run = (command: string, args: string[], cwd: string) => {
  const res = spawnSync(command, args, {
    cwd,
    encoding: 'utf-8',
    maxBuffer: 32 * 1024 * 1024,
  })
  const output = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
  return { status: res.status, output }
}

const must = (command: string, args: string[], cwd: string) => {
  const { status, output } = run(command, args, cwd)
  if (status !== 0) {
    throw new Error(
      `\`${[command, ...args].join(' ')}\` exited ${status} in ${cwd}:\n${output}`,
    )
  }
  return output
}

const waitForHealth = async (url: string, deadlineMs: number) => {
  const until = Date.now() + deadlineMs
  let lastError = 'never attempted'
  while (Date.now() < until) {
    try {
      const res = await fetch(url)
      if (res.ok) return
      lastError = `status ${res.status}`
    } catch (e) {
      lastError = String(e)
    }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(
    `server did not answer ${url} within ${deadlineMs}ms: ${lastError}`,
  )
}

const killTree = (child: ChildProcess) => {
  if (child.pid == null || child.exitCode != null) return
  try {
    // Negative pid targets the process group, so tsx's child node process dies too.
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    child.kill('SIGKILL')
  }
}

const booted: ChildProcess[] = []
let failed = false

// The fixtures link `tealina` and — for the JavaScript frontend, see `clientOverride` —
// `@tealina/client` by path, so what they resolve is the package's `dist/`. Both are built
// once in `global-setup.ts`, above the workers, rather than lazily from here: two test files
// in two workers each building the same package is a `dist/` wiped under a `tsc` that is
// reading it. Read the note there before moving the build back into this file.

afterAll(() => {
  for (const child of booted) killTree(child)
  // Keep the evidence when something failed; leave nothing behind when it all passed.
  if (failed || process.env.TEALINA_E2E_KEEP) {
    console.log(`leaving generated projects in ${tempRoot}`)
    return
  }
  fs.rmSync(tempRoot, { recursive: true, force: true })
})

describeE2E('scaffolded project, end to end', () => {
  it('has the CLI entry and a runner where we expect them', () => {
    expect(fs.existsSync(cliEntry), `missing ${cliEntry}`).toBe(true)
    expect(fs.existsSync(tsxBin), `missing ${tsxBin}`).toBe(true)
  })

  for (const mode of MODES) {
    for (const fw of FRAMEWORKS) {
      it(`${fw} (${mode}): scaffolds, installs, compiles, documents and serves`, async () => {
        onTestFailed(() => {
          failed = true
        })
        const projectDir = path.join(tempRoot, `${fw}-${mode}`)
        const serverDir = path.join(projectDir, 'packages/server')
        fs.rmSync(projectDir, { recursive: true, force: true })
        fs.mkdirSync(tempRoot, { recursive: true })

        // 1. scaffold, without the interactive prompts
        must(
          tsxBin,
          [
            cliEntry,
            projectDir,
            '--template',
            fw,
            ...modeFlags(mode),
            '--no-install',
          ],
          pkgDir,
        )
        const workspaceFile = path.join(projectDir, 'pnpm-workspace.yaml')
        expect(fs.existsSync(workspaceFile)).toBe(true)
        expect(
          fs.existsSync(
            path.join(serverDir, `src/api-v1/post/article.${ext(mode)}`),
          ),
          'the demos were copied under the wrong extension',
        ).toBe(true)

        // Point the generated project's install at the CLI this repo built — see
        // `tealinaOverride`. Appended rather than written, so the file the scaffolder
        // produced is still the one under test.
        fs.appendFileSync(workspaceFile, tealinaOverride(projectDir))

        // 2. install — this is also where a broken `allowBuilds` would surface
        must('pnpm', ['install', '--prefer-offline'], projectDir)

        // 3. the thing create-tealina's equivalent test had commented out. Same command in
        //    both modes: the JavaScript scaffold ships a tsconfig that checks the JSDoc
        //    rather than compiling it, and `tsc` is there either way (in JavaScript mode it
        //    is `gdoc`'s peer dependency, not a build step).
        must(
          'pnpm',
          ['-F', 'server', 'exec', 'tsc', '--noEmit', '-p', 'tsconfig.json'],
          projectDir,
        )

        // 3b. and the other config, which is the one nothing else here would notice. The
        //     dev check above reads `tsconfig.json` (NodeNext); the build reads
        //     `tsconfig.build.json`, and while that one was `Node` it could not see the
        //     `tealina/utility-types` subpath the contract layer imports — a build that
        //     failed on a file the editor had just called clean. TypeScript mode only:
        //     the JavaScript tree has no `build` script, because node runs those files
        //     as they are.
        if (mode === 'ts') {
          must('pnpm', ['-F', 'server', 'build'], projectDir)
          const built = path.join(serverDir, 'dist/index.js')
          expect(
            fs.existsSync(built),
            `\`pnpm -F server build\` wrote nothing to ${built}`,
          ).toBe(true)
        }

        // 4. the doc route reads this file off disk
        must('pnpm', ['-F', 'server', 'gdoc'], projectDir)
        const doc = path.join(serverDir, 'docs/api-v1.json')
        expect(fs.existsSync(doc), `missing ${doc}`).toBe(true)
        const docJson = JSON.parse(fs.readFileSync(doc, 'utf-8'))
        expect(Object.keys(docJson.apis.post)).toEqual(
          expect.arrayContaining(['/login', '/article']),
        )
        expect(docJson.apis.get['/status']).toBeUndefined()

        // The document has to carry the *derived* response, and this is the only place that
        // sees it end to end. `ExtractApiType` degrades to `never` without a compiler error
        // and without `gdoc` complaining, and what a user would get is a doc page whose
        // response type is the literal string `never` — a page that renders, and lies.
        const healthDoc = readDocResponse(docJson, 'get', '/health')
        expect(healthDoc, 'no documentation for the health demo').not.toBe('{}')
        expect(healthDoc, 'the response projection degraded').not.toContain(
          'never',
        )
        // `isOk` is the demo's response field. A `never` projection would not carry it, and
        // neither would an empty one, so this is what makes the line above specific rather
        // than a check that the file merely exists.
        expect(healthDoc, 'the response shape is not the handler').toContain(
          'isOk',
        )

        // 5. boot it on a port of its own
        fs.writeFileSync(
          path.join(serverDir, '.env'),
          `PORT=${PORT[mode][fw]}\n`,
        )
        const base = `http://localhost:${PORT[mode][fw]}`
        const child = spawn('pnpm', ['-F', 'server', 'dev'], {
          cwd: projectDir,
          stdio: 'ignore',
          detached: true,
        })
        booted.push(child)
        await waitForHealth(`${base}/api/v1/health`, 60_000)

        const health = await fetch(`${base}/api/v1/health`)
        expect(health.status).toBe(200)
        expect(await health.json()).toEqual({ isOk: true })

        // /health answering only proves the server booted — it is public because
        // `waitForHealth` needs it to be. /login is the other public demo, and it is
        // what actually pins the marker down: forget `openHandler` in its chain and the
        // route quietly starts requiring a token. The body matters — all three login
        // handlers read `body.account`, so omitting it yields a 500, not a 401.
        const login = await fetch(`${base}/api/v1/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account: 'a', password: 'b' }),
        })
        expect(login.status, `${fw} made /login require a token`).toBe(200)
        expect(await login.json()).toEqual({ token: 'JWT token' })

        // The 401 half is the only thing that can catch a verifyToken that answers
        // without checking the header: T1 type-checks the contract only, so a middleware
        // that lets every call through is invisible to it.
        const anonymous = await fetch(`${base}/api/v1/article`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 't', content: 'c' }),
        })
        expect(anonymous.status, `${fw} let an anonymous call through`).toBe(
          401,
        )
        expect(await anonymous.json()).toEqual({
          code: 'Unauthorized',
          message: 'Authorization header is missing.',
        })

        const authed = await fetch(`${base}/api/v1/article`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'anything',
          },
          body: JSON.stringify({ title: 't', content: 'c' }),
        })
        expect(authed.status).toBe(200)
        expect(await authed.json()).toEqual({ id: 1 })

        const docPage = await fetch(`${base}/api-doc/index.html`)
        expect(docPage.status).toBe(200)

        killTree(child)
      })
    }
  }
})

// ---------------------------------------------------------------------------
// init, against a project that already exists
// ---------------------------------------------------------------------------

/**
 * T3's other half. The scaffold block above proves a generated project works; this proves
 * `init` produces one that works *around* a host — the host keeps serving its own routes,
 * and the tealina routes answer next to them with the same guard behaviour.
 *
 * T5 already type-checks the result and proves the host's files come out byte-identical.
 * What only a real install and boot can show is that the merged `package.json` is enough to
 * run: the host declares nothing but its framework and a runner, so if `init` gets the
 * dependency list wrong, nothing boots.
 */

/** Separate range — a leaked server from the block above must not answer for these. */
const INIT_PORT: Record<Mode, Record<Framework, number>> = {
  ts: { express: 8721, fastify: 8722, koa: 8723 },
  js: { express: 8741, fastify: 8742, koa: 8743 },
}

const HOST_DEP: Record<Framework, Record<string, string>> = {
  express: { express: '^5.1.0' },
  fastify: { fastify: '^5.5.0' },
  koa: { koa: '^3.0.1' },
}

/**
 * The host as it stands *before* `init` — including an entry file that already carries the
 * mount lines `init` would print. That is the state a user is in when they paste the
 * snippet, and it is what makes the byte-identity check below meaningful: `init` is handed
 * a working server and must hand it back untouched.
 */
const hostSourceTs: Record<Framework, Record<string, string>> = {
  express: {
    'src/index.ts': `import express from 'express'
import { buildApiRouter } from './app/routes/api/index.js'
import { VDOC_BASENAME, docRouter } from './app/routes/static/doc.js'
import { usersRouter } from './routes/users.js'

const app = express()
app.use(express.json())
app.use('/users', usersRouter)
app.use('/api', await buildApiRouter())
app.use(VDOC_BASENAME, docRouter)

app.listen(Number(process.env.PORT))
`,
    'src/routes/users.ts': `import { Router } from 'express'

export const usersRouter = Router().get('/', (_req, res) => {
  res.json([{ id: 1, owner: 'host' }])
})
`,
  },
  koa: {
    'src/index.ts': `import Koa from 'koa'
import { buildApiRouter } from './app/routes/api/index.js'
import { docRouter } from './app/routes/static/docs.js'
import { usersRouter } from './routes/users.js'

const app = new Koa()
app.use(usersRouter.routes())
app.use((await buildApiRouter()).routes())
docRouter(app)

app.listen(Number(process.env.PORT))
`,
    // No body parser is mounted on purpose: `init` does not bring one, and the endpoint
    // below is written not to need it. A parser is the host's decision.
    'src/routes/users.ts': `import Router from '@koa/router'

export const usersRouter = new Router().get('/users', ctx => {
  ctx.body = [{ id: 1, owner: 'host' }]
})
`,
  },
  fastify: {
    'src/index.ts': `import fastify from 'fastify'
import { buildApiRouter } from './app/routes/api/index.js'
import { VDOC_BASENAME, docRouter } from './app/routes/static/docs.js'
import { registerUsers } from './routes/users.js'

const app = fastify()
await app.register(registerUsers, { prefix: '/users' })
await app.register(buildApiRouter, { prefix: '/api' })
await app.register(docRouter, { prefix: VDOC_BASENAME })

app.listen({ port: Number(process.env.PORT) })
`,
    'src/routes/users.ts': `import type { FastifyInstance } from 'fastify'

export const registerUsers = async (app: FastifyInstance) => {
  app.get('/', async () => [{ id: 1, owner: 'host' }])
}
`,
  },
}

/**
 * The same host, spelled in JavaScript. Only the two host files change: `init` is given a
 * project that runs on `node` with no build step and no TypeScript toolchain of its own,
 * which is the claim 完整 JS 模式 makes and the one a host with `checkJs` can falsify.
 *
 * The mount lines are the same `/api/routes/...` specifiers the TypeScript host uses. They
 * are not a spelling of a `.ts` path here — after `init` those are real `.js` files, and
 * that is exactly why the JavaScript host has to be a separate fixture rather than the
 * same one with the extension changed.
 */
const hostSourceJs: Record<Framework, Record<string, string>> = {
  express: {
    'src/index.js': `import express from 'express'
import { buildApiRouter } from './app/routes/api/index.js'
import { VDOC_BASENAME, docRouter } from './app/routes/static/doc.js'
import { usersRouter } from './routes/users.js'

const app = express()
app.use(express.json())
app.use('/users', usersRouter)
app.use('/api', await buildApiRouter())
app.use(VDOC_BASENAME, docRouter)

app.listen(Number(process.env.PORT))
`,
    'src/routes/users.js': `import { Router } from 'express'

export const usersRouter = Router().get('/', (_req, res) => {
  res.json([{ id: 1, owner: 'host' }])
})
`,
  },
  koa: {
    'src/index.js': `import Koa from 'koa'
import { buildApiRouter } from './app/routes/api/index.js'
import { docRouter } from './app/routes/static/docs.js'
import { usersRouter } from './routes/users.js'

const app = new Koa()
app.use(usersRouter.routes())
app.use((await buildApiRouter()).routes())
docRouter(app)

app.listen(Number(process.env.PORT))
`,
    // No body parser is mounted on purpose: `init` does not bring one, and the endpoint
    // below is written not to need it. A parser is the host's decision.
    'src/routes/users.js': `import Router from '@koa/router'

export const usersRouter = new Router().get('/users', ctx => {
  ctx.body = [{ id: 1, owner: 'host' }]
})
`,
  },
  fastify: {
    'src/index.js': `import fastify from 'fastify'
import { buildApiRouter } from './app/routes/api/index.js'
import { VDOC_BASENAME, docRouter } from './app/routes/static/docs.js'
import { registerUsers } from './routes/users.js'

const app = fastify()
await app.register(registerUsers, { prefix: '/users' })
await app.register(buildApiRouter, { prefix: '/api' })
await app.register(docRouter, { prefix: VDOC_BASENAME })

app.listen({ port: Number(process.env.PORT) })
`,
    'src/routes/users.js': `/** @param {import('fastify').FastifyInstance} app */
export const registerUsers = async app => {
  app.get('/', async () => [{ id: 1, owner: 'host' }])
}
`,
  },
}

const hostSource: Record<Mode, Record<Framework, Record<string, string>>> = {
  ts: hostSourceTs,
  js: hostSourceJs,
}

/**
 * Two endpoints written by hand *after* `init`, so nothing here depends on the demo files
 * `init` deliberately does not copy. `/health` carries the `openHandler` marker and is the
 * one readiness can poll; `/secret` says nothing and so requires a token.
 */
const initEndpointsTs: Record<Framework, Record<string, string>> = {
  express: {
    'src/api-v1/get/health.ts': `import type { EmptyObj, OpenHandler } from '../../../types/handler.js'
import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

type ApiType = OpenHandler<EmptyObj, { isOk: boolean }>

const handler: ApiType = async (_req, res) => {
  res.send({ isOk: true })
}

export default convention(openHandler, handler)
`,
    'src/api-v1/post/secret.ts': `import type { AuthedHandler } from '../../../types/handler.js'
import { convention } from '../../convention.js'

type ApiType = AuthedHandler<EmptyObj, { id: number }>

const handler: ApiType = async (_req, res) => {
  res.send({ id: 1 })
}

export default convention(handler)
`,
  },
  koa: {
    'src/api-v1/get/health.ts': `import type { EmptyObj, OpenHandler } from '../../../types/handler.js'
import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

type ApiType = OpenHandler<EmptyObj, { isOk: boolean }>

const handler: ApiType = async ctx => {
  ctx.body = { isOk: true }
}

export default convention(openHandler, handler)
`,
    'src/api-v1/post/secret.ts': `import type { EmptyObj, AuthedHandler } from '../../../types/handler.js'
import { convention } from '../../convention.js'

type ApiType = AuthedHandler<EmptyObj, { id: number }>

const handler: ApiType = async ctx => {
  ctx.body = { id: 1 }
}

export default convention(handler)
`,
  },
  fastify: {
    'src/api-v1/get/health.ts': `import type { EmptyObj, OpenHandler } from '../../../types/handler.js'
import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

type ApiType = OpenHandler<EmptyObj, { isOk: boolean }>

const handler: ApiType = async (_request, reply) => {
  reply.send({ isOk: true })
}

export default convention(openHandler, handler)
`,
    'src/api-v1/post/secret.ts': `import type { EmptyObj, AuthedHandler } from '../../../types/handler.js'
import { convention } from '../../convention.js'

type ApiType = AuthedHandler<EmptyObj, { id: number }>

const handler: ApiType = async (_request, reply) => {
  reply.send({ id: 1 })
}

export default convention(handler)
`,
  },
}

/**
 * The same two endpoints in the form a checked `.js` file uses: the handler's type is a
 * JSDoc `@type` above the declaration, which is what `align` writes and what the shipped
 * JavaScript trees are written in. Note that this is the end-to-end proof of that form —
 * a `tsc` run inside a real installed project is the only thing here that would say so, and
 * it is the only arm that would fail if the contract stopped accepting it.
 */
const initEndpointsJs: Record<Framework, Record<string, string>> = {
  express: {
    'src/api-v1/get/health.js': `import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

/**
 * @typedef {import('../../../types/handler.js').OpenHandler<import('../../../types/handler.js').EmptyObj, { isOk: boolean }>} ApiType
 */

/** @type {ApiType} */
const handler = async (_req, res) => {
  res.send({ isOk: true })
}

export default convention(openHandler, handler)
`,
    'src/api-v1/post/secret.js': `import { convention } from '../../convention.js'

/**
 * @typedef {import('../../../types/handler.js').AuthedHandler<import('../../../types/handler.js').EmptyObj, { id: number }>} ApiType
 */

/** @type {ApiType} */
const handler = async (_req, res) => {
  res.send({ id: 1 })
}

export default convention(handler)
`,
  },
  koa: {
    'src/api-v1/get/health.js': `import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

/**
 * @typedef {import('../../../types/handler.js').OpenHandler<import('../../../types/handler.js').EmptyObj, { isOk: boolean }>} ApiType
 */

/** @type {ApiType} */
const handler = async ctx => {
  ctx.body = { isOk: true }
}

export default convention(openHandler, handler)
`,
    'src/api-v1/post/secret.js': `import { convention } from '../../convention.js'

/**
 * @typedef {import('../../../types/handler.js').AuthedHandler<import('../../../types/handler.js').EmptyObj, { id: number }>} ApiType
 */

/** @type {ApiType} */
const handler = async ctx => {
  ctx.body = { id: 1 }
}

export default convention(handler)
`,
  },
  fastify: {
    'src/api-v1/get/health.js': `import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

/**
 * @typedef {import('../../../types/handler.js').OpenHandler<import('../../../types/handler.js').EmptyObj, { isOk: boolean }>} ApiType
 */

/** @type {ApiType} */
const handler = async (_request, reply) => {
  reply.send({ isOk: true })
}

export default convention(openHandler, handler)
`,
    'src/api-v1/post/secret.js': `import { convention } from '../../convention.js'

/**
 * @typedef {import('../../../types/handler.js').AuthedHandler<import('../../../types/handler.js').EmptyObj, { id: number }>} ApiType
 */

/** @type {ApiType} */
const handler = async (_request, reply) => {
  reply.send({ id: 1 })
}

export default convention(handler)
`,
  },
}

const initEndpoints: Record<Mode, Record<Framework, Record<string, string>>> = {
  ts: initEndpointsTs,
  js: initEndpointsJs,
}

const writeFiles = (dir: string, files: Record<string, string>) => {
  for (const [rel, content] of Object.entries(files)) {
    const dest = path.join(dir, rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, content)
  }
}

const readFiles = (dir: string, rels: string[]) =>
  Object.fromEntries(
    rels.map(rel => [rel, fs.readFileSync(path.join(dir, rel), 'utf-8')]),
  )

/** `DocKind.EntityRef` in `@tealina/doc-types`. Not imported: a test dependency on the
 * doc-types package to read one number would be a real edge for a naming convenience. */
const kEntityRef = 4

/**
 * The document is a graph, not a tree: a response is usually an entry in `entityRefs`, with
 * the shape living there. Reading the endpoint alone would assert that an integer id is
 * present, which passes whatever the type turned out to be — including `never`.
 */
const readDocType = (doc: Record<string, any>, node: unknown) => {
  const ref = node as { kind?: number; id?: number } | undefined
  return ref?.kind === kEntityRef ? doc.entityRefs[String(ref.id)] : ref
}

/** The response shape a doc page would render for one endpoint, as text. */
const readDocResponse = (
  doc: Record<string, any>,
  method: string,
  url: string,
) => JSON.stringify(readDocType(doc, doc.apis[method]?.[url]?.response))

describeE2E('init into an existing project, end to end', () => {
  for (const mode of MODES) {
    for (const fw of FRAMEWORKS) {
      it(`${fw} (${mode}): installs beside a running host and serves both route sets`, async () => {
        onTestFailed(() => {
          failed = true
        })
        const projectDir = path.join(tempRoot, `init-${fw}-${mode}`)
        fs.rmSync(projectDir, { recursive: true, force: true })
        fs.mkdirSync(projectDir, { recursive: true })

        // 1. the project that already exists
        writeFiles(projectDir, hostSource[mode][fw])
        writeFiles(projectDir, {
          'package.json': `${JSON.stringify(
            {
              name: `existing-${fw}-api`,
              private: true,
              type: 'module',
              dependencies: HOST_DEP[fw],
              // The toolchain is the host's own choice, and the two modes disagree about
              // what one is: a TypeScript host needs `tsx` to run its own `.ts` files and a
              // compiler to check them, and is given both here; a JavaScript host runs its
              // own files with `node` and is given nothing — `init` is what puts `typescript`
              // in that project. Neither mode's `init` adds `tsx`, which is why the
              // TypeScript fixture has to bring its own or nothing would boot.
              //
              // `typescript` mirrors the template's own pin rather than being left to
              // `tealina`'s peer range (`>=5.6.2 <7`). The fixture has to be checked by the
              // compiler a scaffolded project actually gets: `gdoc` drives the compiler API,
              // so the version is not incidental to what these tests exercise.
              devDependencies:
                mode === 'js' ? {} : { tsx: '^4.20.5', typescript: '~6.0.3' },
              scripts: {
                dev: mode === 'js' ? 'node src/index.js' : 'tsx src/index.ts',
              },
            },
            null,
            2,
          )}\n`,
          'tsconfig.json': `${JSON.stringify(
            {
              compilerOptions: {
                target: 'ES2023',
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                noEmit: true,
                ...(mode === 'js' ? { allowJs: true, checkJs: true } : {}),
              },
              include: ['types/**/*.d.ts', `src/**/*.${ext(mode)}`],
            },
            null,
            2,
          )}\n`,
          // Without this, pnpm walks up and finds the monorepo's workspace file, and the
          // install stops being this project's own. `allowBuilds` is the same entry the
          // scaffold's root ships: esbuild's postinstall is what fetches tsx's binary, and
          // both modes end up with esbuild in the tree — `tealina` pulls tsx in to run a
          // config, and the JavaScript host has no tsx of its own to blame it on.
          'pnpm-workspace.yaml': `packages:\n  - 'packages/*'\n\nallowBuilds:\n  esbuild: true\n${tealinaOverride(projectDir)}`,
        })

        const hostFiles = Object.keys(hostSource[mode][fw])
        const before = readFiles(projectDir, hostFiles)

        // 2. init
        must(
          tsxBin,
          [cliEntry, 'init', projectDir, '--template', fw, ...modeFlags(mode)],
          pkgDir,
        )

        // 3. their code is their code
        expect(readFiles(projectDir, hostFiles)).toEqual(before)

        // 4. install, then the two commands the merge added — a host that already had a
        //    script under one of those names would have been left alone, which T5 covers.
        must('pnpm', ['install', '--prefer-offline'], projectDir)
        writeFiles(projectDir, initEndpoints[mode][fw])
        must('pnpm', ['run', 'align'], projectDir)
        must('pnpm', ['run', 'gdoc'], projectDir)

        // The same assertion the scaffold block makes, on the other half of the feature. It
        // matters more here: `init` installed the convention *around* a host, so a projection
        // reading the wrong `convention.<ext>` — the host's own, or the other mode's copy —
        // would produce a document that renders and lies. A `never` response is exactly what
        // that looks like, and it is not a compiler error anywhere.
        const docPath = path.join(projectDir, 'docs/api-v1.json')
        expect(fs.existsSync(docPath), `missing ${docPath}`).toBe(true)
        const healthDoc = readDocResponse(
          JSON.parse(fs.readFileSync(docPath, 'utf-8')),
          'get',
          '/health',
        )
        expect(healthDoc, 'the response projection degraded').not.toContain(
          'never',
        )
        expect(healthDoc, 'the response shape is not the handler').toContain(
          'isOk',
        )

        // 5. boot it, with the port in the environment because a host that never had
        //    `src/config/env.ts` reads its own configuration its own way
        const base = `http://localhost:${INIT_PORT[mode][fw]}`
        const child = spawn('pnpm', ['run', 'dev'], {
          cwd: projectDir,
          stdio: 'ignore',
          detached: true,
          env: { ...process.env, PORT: String(INIT_PORT[mode][fw]) },
        })
        booted.push(child)
        await waitForHealth(`${base}/api/v1/health`, 60_000)

        // The host's own route, still answering: the feature's whole promise, at runtime.
        const users = await fetch(`${base}/users`)
        expect(users.status).toBe(200)
        expect(await users.json()).toEqual([{ id: 1, owner: 'host' }])

        // Public because its chain carries the `openHandler` marker. The readiness poll
        // above already proved it answers; this pins down the body, which is what a handler
        // with a typed response actually produces.
        const health = await fetch(`${base}/api/v1/health`)
        expect(health.status).toBe(200)
        expect(await health.json()).toEqual({ isOk: true })

        // The guard travelled with the copy: a host that has never seen `verifyToken` gets
        // 401 on anything that does not ask to be public.
        const anonymous = await fetch(`${base}/api/v1/secret`, {
          method: 'POST',
        })
        expect(
          anonymous.status,
          `${fw} served an authed route anonymously`,
        ).toBe(401)
        expect(await anonymous.json()).toEqual({
          code: 'Unauthorized',
          message: 'Authorization header is missing.',
        })

        const authed = await fetch(`${base}/api/v1/secret`, {
          method: 'POST',
          headers: { Authorization: 'anything' },
        })
        expect(authed.status).toBe(200)
        expect(await authed.json()).toEqual({ id: 1 })

        // The doc page reads `docs/api-v1.json` off disk — the file `pnpm run gdoc` produced
        // through the script `init` merged in.
        expect((await fetch(`${base}/api-doc/index.html`)).status).toBe(200)

        killTree(child)
      })
    }
  }
})

// ---------------------------------------------------------------------------
// the frontend, against a real install
// ---------------------------------------------------------------------------

/**
 * T3's third arm. The blocks above prove the server half; this proves the frontend is a
 * project a user can actually build — a real `vite`, a real `tsc` over the whole package
 * rather than the narrowed `include` T5 uses, and a real `@tealina/client` off the registry.
 *
 * Express in both modes and not all three frameworks, because the framework is not a
 * variable here. The web package reads the *contract* — `server/api/v1`, one entry published
 * identically by every server template — and T5 already holds the web tree against all three
 * frameworks' contract layers, offline. What only an install can show is that the package's
 * own dependency list is enough to build it.
 */
describeE2E('scaffolded project with a frontend, end to end', () => {
  for (const mode of MODES) {
    it(`express (${mode}): the frontend builds, and breaks when the server changes`, () => {
      onTestFailed(() => {
        failed = true
      })
      const projectDir = path.join(tempRoot, `web-express-${mode}`)
      const serverDir = path.join(projectDir, 'packages/server')
      const webDir = path.join(projectDir, 'packages/web')
      fs.rmSync(projectDir, { recursive: true, force: true })
      fs.mkdirSync(tempRoot, { recursive: true })

      // 1. scaffold, with the frontend
      must(
        tsxBin,
        [
          cliEntry,
          projectDir,
          '--template',
          'express',
          ...modeFlags(mode),
          '--no-install',
          '--web',
        ],
        pkgDir,
      )
      const page = path.join(webDir, `src/main.${ext(mode)}`)
      expect(fs.existsSync(page), `missing ${page}`).toBe(true)
      expect(fs.existsSync(path.join(webDir, 'index.html'))).toBe(true)

      // The root scripts have to cover both packages, and this is the only place the
      // rewrite is observable: `pnpm dev` in the generated project has to start the Vite
      // server as well as the API.
      const rootPkg = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'),
      )
      expect(rootPkg.scripts.dev).toBe('pnpm -r --parallel dev')
      expect(rootPkg.scripts.build).toBe('pnpm -r build')

      const workspaceFile = path.join(projectDir, 'pnpm-workspace.yaml')
      fs.appendFileSync(
        workspaceFile,
        tealinaOverride(projectDir, [
          ...(mode === 'js' ? [clientOverride(projectDir)] : []),
        ]),
      )

      // 2. install — two packages' worth of dependencies, from the registry
      must('pnpm', ['install', '--prefer-offline'], projectDir)

      // 3. build: `tsc --noEmit` over the whole package, then a real `vite build`. The
      //    page reads `isOk` off the health response, so this fails unless the server's
      //    contract really is resolving into the frontend's types.
      must('pnpm', ['-F', 'web', 'build'], projectDir)
      expect(
        fs.existsSync(path.join(webDir, 'dist/index.html')),
        'vite did not emit a page',
      ).toBe(true)

      // 4. the claim the whole feature rests on, end to end: rename the field on the
      //    server and the frontend stops building. Nothing on the web side is edited.
      const health = path.join(
        serverDir,
        'src/api-v1/get',
        `health.${ext(mode)}`,
      )
      const original = fs.readFileSync(health, 'utf-8')
      fs.writeFileSync(health, original.replaceAll('isOk', 'ok'))

      const { status, output } = run('pnpm', ['-F', 'web', 'build'], projectDir)
      fs.writeFileSync(health, original)

      expect(
        status,
        `the frontend built against a renamed response field:\n${output}`,
      ).not.toBe(0)
      // Named rather than "something failed": the error has to be the page reading a field
      // that is no longer there, not a build that fell over for an unrelated reason.
      expect(output).toContain('isOk')

      // 5. and it builds again once the server is put back, so the failure above was the
      //    rename and not a build that had been broken all along.
      must('pnpm', ['-F', 'web', 'build'], projectDir)
    })
  }
})

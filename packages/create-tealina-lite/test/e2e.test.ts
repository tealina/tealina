import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it, onTestFailed } from 'vitest'

/**
 * T3 — the acceptance test: scaffold a real project, install it, compile it, generate
 * its docs, boot it, and talk to it.
 *
 * This is the only test that can see the runtime half of the scaffold. T1 type-checks
 * the contract and the demos; nothing there can observe that express's `verifyToken`
 * actually rejects a request without an Authorization header, or that dropping
 * `catchErrorWrapper` did not turn a handler rejection into a crash.
 *
 * It needs the network (three installs), so it is gated locally and on in CI. Run it
 * with `TEALINA_E2E=1 pnpm -F create-tealina-lite test`.
 *
 * Everything the demos promise is asserted for all three frameworks, because the whole
 * point of shipping three templates is that they behave the same.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgDir = path.resolve(here, '..')
const tempRoot = path.join(pkgDir, 'temp/e2e')
const cliEntry = path.join(pkgDir, 'src/index.ts')
const tsxBin = path.join(pkgDir, 'node_modules/.bin/tsx')

const enabled = process.env.TEALINA_E2E === '1' || process.env.CI != null
const describeE2E = enabled ? describe : describe.skip

const FRAMEWORKS = ['express', 'fastify', 'koa'] as const
type Framework = (typeof FRAMEWORKS)[number]

/** Distinct ports so a leaked server from one framework cannot answer for the next. */
const PORT: Record<Framework, number> = {
  express: 8711,
  fastify: 8712,
  koa: 8713,
}

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

  for (const fw of FRAMEWORKS) {
    it(`${fw}: scaffolds, installs, compiles, documents and serves`, async () => {
      onTestFailed(() => {
        failed = true
      })
      const projectDir = path.join(tempRoot, fw)
      const serverDir = path.join(projectDir, 'packages/server')
      fs.rmSync(projectDir, { recursive: true, force: true })
      fs.mkdirSync(tempRoot, { recursive: true })

      // 1. scaffold, without the interactive prompts
      must(
        tsxBin,
        [cliEntry, projectDir, '--template', fw, '--no-install'],
        pkgDir,
      )
      expect(fs.existsSync(path.join(projectDir, 'pnpm-workspace.yaml'))).toBe(
        true,
      )
      expect(
        fs.existsSync(path.join(serverDir, 'src/api-v1/post/article.ts')),
      ).toBe(true)

      // 2. install — this is also where a broken `allowBuilds` would surface
      must('pnpm', ['install', '--prefer-offline'], projectDir)

      // 3. the thing create-tealina's equivalent test had commented out
      must(
        'pnpm',
        ['-F', 'server', 'exec', 'tsc', '--noEmit', '-p', 'tsconfig.json'],
        projectDir,
      )

      // 4. the doc route reads this file off disk
      must('pnpm', ['-F', 'server', 'gdoc'], projectDir)
      const doc = path.join(serverDir, 'docs/api-v1.json')
      expect(fs.existsSync(doc), `missing ${doc}`).toBe(true)
      const docJson = JSON.parse(fs.readFileSync(doc, 'utf-8'))
      expect(Object.keys(docJson.apis.post)).toEqual(
        expect.arrayContaining(['/login', '/article']),
      )
      expect(docJson.apis.get['/status']).toBeUndefined()

      // 5. boot it on a port of its own
      fs.writeFileSync(path.join(serverDir, '.env'), `PORT=${PORT[fw]}\n`)
      const base = `http://localhost:${PORT[fw]}`
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

      // The 401 half is the only thing that can catch a framework whose verifyToken
      // does not check the header — the upstream express template does not, and T1
      // type-checks only, so it can never see this.
      const anonymous = await fetch(`${base}/api/v1/article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 't', content: 'c' }),
      })
      expect(anonymous.status, `${fw} let an anonymous call through`).toBe(401)
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
const INIT_PORT: Record<Framework, number> = {
  express: 8721,
  fastify: 8722,
  koa: 8723,
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
const hostSource: Record<Framework, Record<string, string>> = {
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
 * Two endpoints written by hand *after* `init`, so nothing here depends on the demo files
 * `init` deliberately does not copy. `/health` carries the `openHandler` marker and is the
 * one readiness can poll; `/secret` says nothing and so requires a token.
 */
const initEndpoints: Record<Framework, Record<string, string>> = {
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

describeE2E('init into an existing project, end to end', () => {
  for (const fw of FRAMEWORKS) {
    it(`${fw}: installs beside a running host and serves both route sets`, async () => {
      onTestFailed(() => {
        failed = true
      })
      const projectDir = path.join(tempRoot, `init-${fw}`)
      fs.rmSync(projectDir, { recursive: true, force: true })
      fs.mkdirSync(projectDir, { recursive: true })

      // 1. the project that already exists
      writeFiles(projectDir, hostSource[fw])
      writeFiles(projectDir, {
        'package.json': `${JSON.stringify(
          {
            name: `existing-${fw}-api`,
            private: true,
            type: 'module',
            dependencies: HOST_DEP[fw],
            // The runner is the host's own choice, which is why `init` reports `tsx` and
            // `typescript` instead of adding them. Without these two lines the fixture
            // would have no way to boot.
            devDependencies: { tsx: '^4.20.5' },
            scripts: { dev: 'tsx src/index.ts' },
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
            },
            include: ['types/**/*.d.ts', 'src/**/*.ts'],
          },
          null,
          2,
        )}\n`,
        // Without this, pnpm walks up and finds the monorepo's workspace file, and the
        // install stops being this project's own. `allowBuilds` is the same entry the
        // scaffold's root ships: esbuild's postinstall is what fetches tsx's binary.
        'pnpm-workspace.yaml': `packages:\n  - 'packages/*'\n\nallowBuilds:\n  esbuild: true\n`,
      })

      const hostFiles = Object.keys(hostSource[fw])
      const before = readFiles(projectDir, hostFiles)

      // 2. init
      must(tsxBin, [cliEntry, 'init', projectDir, '--template', fw], pkgDir)

      // 3. their code is their code
      expect(readFiles(projectDir, hostFiles)).toEqual(before)

      // 4. install, then the two commands the merge added — a host that already had a
      //    script under one of those names would have been left alone, which T5 covers.
      must('pnpm', ['install', '--prefer-offline'], projectDir)
      writeFiles(projectDir, initEndpoints[fw])
      must('pnpm', ['run', 'align'], projectDir)
      must('pnpm', ['run', 'gdoc'], projectDir)

      // 5. boot it, with the port in the environment because a host that never had
      //    `src/config/env.ts` reads its own configuration its own way
      const base = `http://localhost:${INIT_PORT[fw]}`
      const child = spawn('pnpm', ['run', 'dev'], {
        cwd: projectDir,
        stdio: 'ignore',
        detached: true,
        env: { ...process.env, PORT: String(INIT_PORT[fw]) },
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
      const anonymous = await fetch(`${base}/api/v1/secret`, { method: 'POST' })
      expect(anonymous.status, `${fw} served an authed route anonymously`).toBe(
        401,
      )
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
})

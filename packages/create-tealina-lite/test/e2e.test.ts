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

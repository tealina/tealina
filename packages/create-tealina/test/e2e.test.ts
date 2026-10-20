import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it, onTestFailed } from 'vite-plus/test'

/**
 * T3 — the acceptance test: scaffold a real project, install it, compile it, generate
 * its docs, boot it, and talk to it.
 *
 * This is the only test that can see the runtime half of the scaffold. T1 type-checks the
 * contract and the demos; nothing there can observe that express's `verifyToken` actually
 * rejects a request without an Authorization header, or that one package's `exports` map
 * points at a file the next package can read.
 *
 * It needs the network (five installs), so it is gated locally and on in CI. Run it with
 * `TEALINA_E2E=1 pnpm -F create-tealina test`.
 *
 * Everything the demos promise is asserted for all three frameworks, because the whole
 * point of shipping three templates is that they behave the same.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgDir = path.resolve(here, '..')
const repoRoot = path.resolve(pkgDir, '../..')
const tempRoot = path.join(pkgDir, 'temp/e2e')
const cliEntry = path.join(pkgDir, 'src/index.ts')
const tsxBin = path.join(pkgDir, 'node_modules/.bin/tsx')
const tealinaDir = path.join(repoRoot, 'packages/tealina')
const tealinaServerDir = path.join(repoRoot, 'packages/tealina-server')
const docUiDir = path.join(repoRoot, 'packages/tealina-doc-ui')

const enabled = process.env.TEALINA_E2E === '1' || process.env.CI != null
const describeE2E = enabled ? describe : describe.skip

const FRAMEWORKS = ['express', 'fastify', 'koa'] as const
type Framework = (typeof FRAMEWORKS)[number]

/** Distinct ports so a leaked server from one block cannot answer for the next. */
const PORT: Record<Framework, number> = {
  express: 8711,
  fastify: 8712,
  koa: 8713,
}

/** A port past the framework ports above, for the two-version project. */
const kMultiVersionPort = 8751

/** The three backend packages, in the order the test's assertions reach them. */
const backendDir = (projectDir: string) => path.join(projectDir, 'backend')
const serverDir = (projectDir: string) =>
  path.join(backendDir(projectDir), 'server')
const apiV1Dir = (projectDir: string) =>
  path.join(backendDir(projectDir), 'api-v1')
const apiV2Dir = (projectDir: string) =>
  path.join(backendDir(projectDir), 'api-v2')
const coreDir = (projectDir: string) =>
  path.join(backendDir(projectDir), 'core')

/**
 * The packages every fixture installs from this repo rather than from npm.
 *
 * The templates declare a published range for them, and that is right for a user — it is
 * the release they will get. It is wrong for this test. The route keys that `align`
 * generates carry no leading slash — `@tealina/server` is where the slash comes back, in
 * `transformToRouteOptions`. A fixture that took the published server would be generating
 * its barrels with one side of that contract and routing them with the other.
 *
 * The overrides are scoped to the fixture's own workspace file, so the templates are
 * untouched and a real user's install is unaffected.
 *
 * `@tealina/doc-ui` is linked for the same reason: `TealinaVdocSource` is the type the
 * templates now hand between an api version and the host, and the published release does
 * not have it yet. A fixture that installed the release would fail to compile a tree that
 * is correct against this repo.
 *
 * `link:` needs a path relative to the *workspace root*, which is the fixture directory —
 * pnpm rewrites it into `node_modules/` from there.
 */
const appendWorkspaceOverrides = (
  workspaceFile: string,
  projectDir: string,
) => {
  const entries = [
    `  tealina: link:${path.relative(projectDir, tealinaDir)}`,
    `  '@tealina/server': link:${path.relative(projectDir, tealinaServerDir)}`,
    `  '@tealina/doc-ui': link:${path.relative(projectDir, docUiDir)}`,
  ]
  // The template ships an `overrides:` block of its own (the `vite` alias), so the fixture
  // cannot append a second top-level key. Add its entries to the block that exists.
  const lines = fs.readFileSync(workspaceFile, 'utf-8').split('\n')
  const at = lines.findIndex(line => line.trimEnd() === 'overrides:')
  if (at === -1) lines.push('overrides:', ...entries)
  else lines.splice(at + 1, 0, ...entries)
  fs.writeFileSync(workspaceFile, lines.join('\n'))
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

// The fixtures link `tealina`, `@tealina/server` and `@tealina/doc-ui` — see
// `appendWorkspaceOverrides` — by path, so what they resolve is the package's `dist/`. All
// of them are built once in `global-setup.ts`, above the workers, rather than lazily from
// here: two test files in two workers each building the same package is a `dist/` wiped
// under a `tsc` that is reading it. Read the note there before moving the build back into
// this file.

afterAll(() => {
  for (const child of booted) killTree(child)
  // Keep the evidence when something failed; leave nothing behind when it all passed.
  if (failed || process.env.TEALINA_E2E_KEEP) {
    console.log(`leaving generated projects in ${tempRoot}`)
    return
  }
  fs.rmSync(tempRoot, { recursive: true, force: true })
})

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
      fs.rmSync(projectDir, { recursive: true, force: true })
      fs.mkdirSync(tempRoot, { recursive: true })

      // 1. scaffold, without the interactive prompts
      must(
        tsxBin,
        [cliEntry, projectDir, '--template', fw, '--no-install'],
        pkgDir,
      )
      const workspaceFile = path.join(projectDir, 'pnpm-workspace.yaml')
      expect(fs.existsSync(workspaceFile)).toBe(true)
      expect(
        fs.readFileSync(workspaceFile, 'utf-8'),
        'the backend packages are not in the workspace',
      ).toContain("'backend/*'")

      // The three packages landed where the imports say they are.
      const demo = path.join(apiV1Dir(projectDir), 'src/api/post/article.ts')
      expect(fs.existsSync(demo), `missing ${demo}`).toBe(true)
      expect(
        fs.existsSync(path.join(coreDir(projectDir), 'types/handler.d.ts')),
        'the contract layer is not in core',
      ).toBe(true)

      // Point the generated project's install at the CLI this repo built — see
      // `appendWorkspaceOverrides`. Edited rather than rewritten, so the file the
      // scaffolder produced is still the one under test.
      appendWorkspaceOverrides(workspaceFile, projectDir)

      // 2. install — this is also where a broken `allowBuilds` would surface
      must('pnpm', ['install', '--prefer-offline'], projectDir)

      // 3. build every package in topological order. This compiles each package with
      //    `tsc`, and is the first thing that resolves `core/handler` and `api-v1/mount`
      //    through a real `exports` map.
      must('pnpm', ['-r', 'build'], projectDir)

      // The scaffold ships the formatter and linter configured to its own sources, so
      // `check` has to pass on the template before anything is edited.
      //
      // The fixtures live under this repo's ignored `temp/`, and Vite+'s ignore
      // discovery would otherwise exclude the whole project. Making the fixture its own
      // git root leaves the generated `.gitignore` as the only one that applies.
      fs.mkdirSync(path.join(projectDir, '.git'))
      must('pnpm', ['check'], projectDir)

      for (const [label, built] of [
        ['core', path.join(coreDir(projectDir), 'dist/access/index.js')],
        ['api-v1', path.join(apiV1Dir(projectDir), 'dist/mount.js')],
        ['server', path.join(serverDir(projectDir), 'dist/index.js')],
      ] as const) {
        expect(
          fs.existsSync(built),
          `\`${label}\` build wrote nothing to ${built}`,
        ).toBe(true)
      }

      // 4. the doc route reads this file off disk
      must('pnpm', ['-F', 'api-v1', 'gdoc'], projectDir)
      const doc = path.join(apiV1Dir(projectDir), 'docs/api.json')
      expect(fs.existsSync(doc), `missing ${doc}`).toBe(true)
      const docJson = JSON.parse(fs.readFileSync(doc, 'utf-8'))
      expect(Object.keys(docJson.apis.post)).toEqual(
        expect.arrayContaining(['login', 'article']),
      )
      expect(docJson.apis.get['status']).toBeUndefined()

      // The document has to carry the *derived* response, and this is the only place that
      // sees it end to end. `ExtractApiType` degrades to `never` without a compiler error
      // and without `gdoc` complaining, and what a user would get is a doc page whose
      // response type is the literal string `never` — a page that renders, and lies.
      const healthDoc = readDocResponse(docJson, 'get', 'health')
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
        path.join(serverDir(projectDir), '.env'),
        `PORT=${PORT[fw]}\n`,
      )
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
      // `waitForHealth` needs it to be. /login is the other public demo, and it is what
      // actually pins the choice down: build it with `authedApi` instead and the route
      // quietly starts requiring a token. The body matters — all three login handlers
      // read `body.account`, so omitting it yields a 500, not a 401.
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
      const pageHtml = await docPage.text()
      expect(pageHtml, `${fw} docs page has no source for v1`).toContain(
        '/api/v1/_doc/api.json',
      )

      // The page reads a json the version package publishes. Asking for it directly is
      // what distinguishes a mounted source from a page whose selector silently has
      // nothing to show.
      const servedDoc = await fetch(`${base}/api/v1/_doc/api.json`)
      expect(servedDoc.status, `${fw} version json route`).toBe(200)
      expect(await servedDoc.json()).toEqual(docJson)

      killTree(child)
    })
  }
})

// ---------------------------------------------------------------------------
// two api versions, one documentation page
// ---------------------------------------------------------------------------

/**
 * Why the page belongs to the host rather than to a version.
 *
 * The templates wire one version, so nothing above can observe what a second one does. This
 * project copies `api-v1` to `api-v2`, gives the copy its own `API_VERSION`, and mounts
 * both. What has to hold is that each version serves its own document at its own prefix and
 * that the host's page lists both — the aggregation the split exists for.
 *
 * Express only: the second version's files are the first version's, so the framework is not
 * a variable here.
 */
describeE2E('two api versions share one documentation page', () => {
  it('express: each version publishes its json and the host lists both', async () => {
    onTestFailed(() => {
      failed = true
    })
    const projectDir = path.join(tempRoot, 'multi-version-express')
    fs.rmSync(projectDir, { recursive: true, force: true })
    fs.mkdirSync(tempRoot, { recursive: true })

    must(
      tsxBin,
      [cliEntry, projectDir, '--template', 'express', '--no-install'],
      pkgDir,
    )
    appendWorkspaceOverrides(
      path.join(projectDir, 'pnpm-workspace.yaml'),
      projectDir,
    )

    // A second version is a copy of the first with a different name: the starting point a
    // user has when v2 begins to diverge from v1.
    const v2Dir = apiV2Dir(projectDir)
    fs.cpSync(apiV1Dir(projectDir), v2Dir, { recursive: true })
    const v2PkgFile = path.join(v2Dir, 'package.json')
    const v2Pkg = JSON.parse(fs.readFileSync(v2PkgFile, 'utf-8'))
    v2Pkg.name = 'api-v2'
    fs.writeFileSync(v2PkgFile, `${JSON.stringify(v2Pkg, null, 2)}\n`)
    const v2VersionFile = path.join(v2Dir, 'version.js')
    const v2Version = fs
      .readFileSync(v2VersionFile, 'utf-8')
      .replace("API_VERSION = 'v1'", "API_VERSION = 'v2'")
    expect(v2Version, 'the copy did not take a new version').toContain(
      "API_VERSION = 'v2'",
    )
    fs.writeFileSync(v2VersionFile, v2Version)

    // The host is the only place that knows there is more than one version.
    const serverPkgFile = path.join(serverDir(projectDir), 'package.json')
    const serverPkg = JSON.parse(fs.readFileSync(serverPkgFile, 'utf-8'))
    serverPkg.dependencies['api-v2'] = 'workspace:*'
    fs.writeFileSync(serverPkgFile, `${JSON.stringify(serverPkg, null, 2)}\n`)

    const appFile = path.join(serverDir(projectDir), 'src/app.ts')
    const appText = fs
      .readFileSync(appFile, 'utf-8')
      .replace(
        "import { mount } from 'api-v1/mount'",
        "import { mount } from 'api-v1/mount'\nimport { mount as mountV2 } from 'api-v2/mount'",
      )
      .replace(
        'const v1 = await mount(app)\n  await mountDocs(app, [v1])',
        'const v1 = await mount(app)\n  const v2 = await mountV2(app)\n  await mountDocs(app, [v1, v2])',
      )
    expect(appText, 'the host was not wired to the second version').toContain(
      'mountDocs(app, [v1, v2])',
    )
    fs.writeFileSync(appFile, appText)

    must('pnpm', ['install', '--prefer-offline'], projectDir)
    must('pnpm', ['-r', 'build'], projectDir)
    must('pnpm', ['-F', 'api-v1', 'gdoc'], projectDir)
    must('pnpm', ['-F', 'api-v2', 'gdoc'], projectDir)

    fs.writeFileSync(
      path.join(serverDir(projectDir), '.env'),
      `PORT=${kMultiVersionPort}\n`,
    )
    const base = `http://localhost:${kMultiVersionPort}`
    const child = spawn('pnpm', ['-F', 'server', 'dev'], {
      cwd: projectDir,
      stdio: 'ignore',
      detached: true,
    })
    booted.push(child)
    await waitForHealth(`${base}/api/v1/health`, 60_000)

    const v2Health = await fetch(`${base}/api/v2/health`)
    expect(v2Health.status, 'v2 was not mounted under its own prefix').toBe(200)
    expect(await v2Health.json()).toEqual({ isOk: true })

    for (const version of ['v1', 'v2']) {
      const res = await fetch(`${base}/api/${version}/_doc/api.json`)
      expect(res.status, `${version} publishes no json`).toBe(200)
      const doc = await res.json()
      expect(
        Object.keys(doc.apis.post),
        `${version} served someone else's document`,
      ).toEqual(expect.arrayContaining(['article', 'login']))
    }

    const page = await fetch(`${base}/api-doc/index.html`)
    expect(page.status).toBe(200)
    const html = await page.text()
    expect(html, 'v1 is missing from the page').toContain(
      '/api/v1/_doc/api.json',
    )
    expect(html, 'v2 is missing from the page').toContain(
      '/api/v2/_doc/api.json',
    )
    expect(html, 'the selector has no label for v2').toContain('"name":"v2"')

    killTree(child)
  })
})

// ---------------------------------------------------------------------------
// the frontend, against a real install
// ---------------------------------------------------------------------------

/**
 * T3's second arm. The block above proves the server half; this proves the frontend is a
 * project a user can actually build — a real `vite`, a real `tsc` over the whole package
 * rather than the narrowed `include` T1 uses, and a real `@tealina/client` off the registry.
 *
 * Express and not all three frameworks, because the framework is not a variable here. The
 * web package reads the *contract* — `api-v1/api`, one entry published identically by every
 * api template — and T4 already holds the web tree against all three frameworks' contract
 * layers, offline. What only an install can show is that the package's own dependency list
 * is enough to build it.
 */
describeE2E('scaffolded project with a frontend, end to end', () => {
  it('express: the frontend builds, and breaks when the server changes', () => {
    onTestFailed(() => {
      failed = true
    })
    const projectDir = path.join(tempRoot, 'web-express')
    const webDir = path.join(projectDir, 'packages/web')
    fs.rmSync(projectDir, { recursive: true, force: true })
    fs.mkdirSync(tempRoot, { recursive: true })

    // 1. scaffold, with the frontend
    must(
      tsxBin,
      [cliEntry, projectDir, '--template', 'express', '--no-install', '--web'],
      pkgDir,
    )
    const page = path.join(webDir, 'src/main.ts')
    expect(fs.existsSync(page), `missing ${page}`).toBe(true)
    expect(fs.existsSync(path.join(webDir, 'index.html'))).toBe(true)

    // The root scripts have to cover every package. `dev` compiles the two libraries
    // before the watchers start, because the server imports their `dist/`.
    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'),
    )
    expect(rootPkg.scripts.dev).toBe(
      'pnpm -F core build && pnpm -F api-v1 build && pnpm -r --parallel dev',
    )
    expect(rootPkg.scripts.build).toBe('pnpm -r build')
    expect(rootPkg.scripts.check).toBe('vp check')
    expect(rootPkg.devDependencies?.['vite-plus']).toBe('catalog:')

    appendWorkspaceOverrides(
      path.join(projectDir, 'pnpm-workspace.yaml'),
      projectDir,
    )

    // 2. install — four packages' worth of dependencies, from the registry
    must('pnpm', ['install', '--prefer-offline'], projectDir)

    // 3. build: `tsc --noEmit` over the whole package, then a real `vite build`. The page
    //    reads `isOk` off the health response, so this fails unless the server's contract
    //    really is resolving into the frontend's types.
    must('pnpm', ['-F', 'web', 'build'], projectDir)
    expect(
      fs.existsSync(path.join(webDir, 'dist/index.html')),
      'vite did not emit a page',
    ).toBe(true)

    // 4. the claim the whole feature rests on, end to end: rename the field on the server
    //    and the frontend stops building. Nothing on the web side is edited.
    const health = path.join(apiV1Dir(projectDir), 'src/api/get/health.ts')
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
})

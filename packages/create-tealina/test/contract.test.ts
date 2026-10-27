import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import tsTemplate from '../template/common/api-v1/tealina.config.js'
import { PROBE_TS, WIDENED_ACCESS } from './probe.js'

/**
 * T1 — the cheap "does it actually compile" gate.
 *
 * Copies the shipped contract subtree (the `core` types + access + the guard they import,
 * plus `api-v1`'s demos and type entry) into a scratch project and type-checks it. No
 * install and no network: the compiler and the framework types both come from this
 * package's own devDependencies, so this runs in a couple of seconds and is safe to leave
 * on by default.
 *
 * The three packages are one directory apart in a real scaffold, and the handlers reach
 * the contract by name (`core/handler`, `core/access`). Here that seam is rebuilt with
 * `paths` rather than a workspace install, so the fixture still runs offline; the names
 * are the same ones the packages publish.
 *
 * The compiler is the one the *template* pins (`typescript: ~6.0.3` in
 * `template/api-v1/<fw>/package.json`), not whatever the repo root happens to have, and
 * that is the point: a JSDoc `@type` above a `const`, and the overload set that makes it
 * acceptable on an `async` handler, are compiler behaviour — a version nobody installs
 * would be a gate over nothing.
 *
 * The probes themselves live in `test/probe.ts`. Read the note there for why the probe
 * asserts the projections instead of merely importing them.
 *
 * Three things the plain gate above cannot see, each with its own test below: the stub
 * the shipped generator emits (a string no other test ever compiles), the mixed fixture
 * that keeps a `.js` handler beside the `.ts` ones (the migration shape), and the inside
 * of the contract layer's own `.d.ts` files — every tsconfig in this repo sets
 * `skipLibCheck`, so an error written in `types/` is invisible to every other gate here.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgDir = path.resolve(here, '..')
const repoRoot = path.resolve(pkgDir, '../..')
const templateDir = path.join(pkgDir, 'template')
const fixtureRoot = path.join(pkgDir, 'temp/contract')

const tscBin = path.join(pkgDir, 'node_modules/.bin/tsc')
const utilityTypesSrc = path.join(repoRoot, 'packages/utility-types/index.ts')
// The subpath the shipped contract layer imports from. Its source is the one-line
// re-export `tealina` publishes, so mapping it here keeps this test off `pnpm build` too.
const tealinaUtilityTypesSrc = path.join(
  repoRoot,
  'packages/tealina/src/utility-types.ts',
)

const FRAMEWORKS = ['express', 'fastify', 'koa'] as const
type Framework = (typeof FRAMEWORKS)[number]

const baseCompilerOptions = {
  target: 'ES2023',
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
  strict: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  esModuleInterop: true,
  skipLibCheck: true,
  noEmit: true,
  // No `baseUrl`: `paths` has resolved relative to the tsconfig without it since TS 4.1,
  // and TS 6 rejects the option outright (TS5101).
  // Point at the source so this test does not depend on `pnpm build` having run first.
  paths: {
    '@tealina/utility-types': [utilityTypesSrc],
    'tealina/utility-types': [tealinaUtilityTypesSrc],
  },
}

const fixtureTsconfig = (allowJs: boolean) => ({
  compilerOptions: {
    ...baseCompilerOptions,
    ...(allowJs ? { allowJs: true, checkJs: true } : {}),
    paths: { ...baseCompilerOptions.paths, ...corePaths },
  },
  include: [
    'core/types/**/*.d.ts',
    'types/**/*.d.ts',
    'core/src/**/*.ts',
    'src/**/*.ts',
    'probe.ts',
    ...(allowJs ? ['src/**/*.js'] : []),
  ],
})

/**
 * The `core` package's public entries, mapped into the fixture.
 *
 * A real project installs the package and resolves these through its `exports` map; the
 * fixture has no install, so it points at the same three files directly. The specifiers are
 * the published ones, which is what makes this a test of the seam rather than of a path.
 */
const corePaths = {
  'core/handler': ['./core/types/handler.d.ts'],
  'core/common': ['./core/types/common.d.ts'],
  'core/access': ['./core/src/access/index.ts'],
}

type BuildOptions = {
  /** Replaces `core/src/access/index.ts` after the tree has been copied. */
  access?: string
  /** Writes an `align`-generated `.js` handler beside the `.ts` ones. */
  jsHandler?: boolean
  /** Strips express's repeated call signature from `core/types/alias.d.ts`. */
  dropOverload?: boolean
  /** Names the scratch directory, for a variant that differs only in how it is run. */
  key?: string
}

/**
 * A handler in the shape a migrating project has one: a `.js` file, typed through the
 * published `core/handler` entry with a JSDoc `@type`, async, and answering through the
 * response object.
 *
 * The generated stub cannot stand in for it in the `dropOverload` variant. That stub throws
 * instead of returning, so it compiles under a single call signature too, and the variant
 * would assert nothing. Express's alias is the only one that repeats its signature — the
 * other two already return `void`/a promise union, which the compiler accepts for an
 * `async` handler — so this handler is written for express's `(req, res)` parameters.
 */
const MIGRATING_HANDLER = `import { authedApi } from 'core/access'

/**
 * @typedef {object} LegacyPayload
 * @property {string} title
 */

/** @type {import('core/handler').AuthedHandler<{ body: LegacyPayload }, { id: number }>} */
const handler = async (req, res) => {
  const { body } = req
  console.log(body.title)
  res.send({ id: 1 })
}

export default authedApi(handler)
`

async function buildFixture(
  fw: Framework,
  options: BuildOptions = {},
): Promise<string> {
  const variant = options.access
    ? '-mut'
    : options.dropOverload
      ? '-no-overload'
      : options.jsHandler
        ? '-js'
        : options.key
          ? `-${options.key}`
          : ''
  const dest = path.join(fixtureRoot, `${fw}${variant}`)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true })

  const copyInto = (src: string, destDir: string) =>
    fs.cpSync(src, destDir, { recursive: true })

  copyInto(
    path.join(templateDir, 'common/core/types'),
    path.join(dest, 'core/types'),
  )
  copyInto(
    path.join(templateDir, `core/${fw}/types`),
    path.join(dest, 'core/types'),
  )
  copyInto(
    path.join(templateDir, `core/${fw}/src/access`),
    path.join(dest, 'core/src/access'),
  )
  copyInto(
    path.join(templateDir, 'common/api-v1/types'),
    path.join(dest, 'types'),
  )
  if (options.dropOverload) {
    const alias = path.join(dest, 'core/types/alias.d.ts')
    const src = fs.readFileSync(alias, 'utf-8')
    const marker = '  // The same signature, a second time'
    const start = src.indexOf(marker)
    const end = src.lastIndexOf('\n}')
    if (start < 0 || end < start) {
      throw new Error(
        "the template's types/alias.d.ts no longer carries the repeated signature, " +
          'so this variant would quietly test nothing',
      )
    }
    fs.writeFileSync(alias, src.slice(0, start) + src.slice(end))
  }
  copyInto(
    path.join(templateDir, `api-v1/${fw}/src/api`),
    path.join(dest, 'src/api'),
  )
  // The whole module over `core`, guard and all: `access/index` imports `verifyToken`,
  // which is the point of the two sitting together. The guard's 401 branch is app behaviour
  // this fixture never runs; `tsc` only has to be able to read it.
  if (options.access != null) {
    fs.writeFileSync(
      path.join(dest, 'core/src/access/index.ts'),
      options.access,
    )
  }
  // The stub the CLI writes is a string, and nothing else compiles it: the e2e suite runs
  // `align` but never type-checks what came out, so a type name the generator gets wrong
  // would ship unnoticed. It goes next to the hand-written handlers, and it is handed that
  // directory the way the CLI hands it — the stub's imports are resolved from there, so a
  // generator that assumes a depth instead of measuring one fails here.
  const [entry] = tsTemplate.template?.handlers ?? []
  const generateFn = entry?.generateFn
  if (typeof generateFn !== 'function') {
    throw new Error(
      'the template config no longer exposes template.handlers[0].generateFn — ' +
        'the generated stub has stopped being compiled by anything',
    )
  }
  // The shipped stub reads only `fileDir` and `sourceExt`, but `TemplateContext` is what
  // the generator hands a real config, so the rest is filled in rather than cast away.
  const context = {
    filename: 'generated',
    Filename: 'Generated',
    fileDir: 'src/api/post',
    method: 'post',
  }
  fs.writeFileSync(
    path.join(dest, 'src/api/post/generated.ts'),
    generateFn({ ...context, sourceExt: '.ts' }),
  )
  // The same generator, asked for a `.js` file. This is the migration shape: a project
  // that keeps some handlers in JavaScript sets `sourceExt: '.js'` and still expects the
  // CLI to write a file that is valid JavaScript. Hand-writing this fixture instead would
  // leave that branch of the generator unexercised.
  if (options.jsHandler) {
    fs.writeFileSync(
      path.join(dest, 'src/api/post/legacy.js'),
      generateFn({
        ...context,
        filename: 'legacy',
        Filename: 'Legacy',
        sourceExt: '.js',
      }),
    )
  }
  // The probe replaces the stub, not merely joins it: see `MIGRATING_HANDLER` for why the
  // stub cannot show the difference the stripped signature makes.
  if (options.dropOverload) {
    fs.writeFileSync(
      path.join(dest, 'src/api/post/legacy.js'),
      MIGRATING_HANDLER,
    )
  }

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
  fs.writeFileSync(path.join(dest, 'probe.ts'), PROBE_TS)
  fs.writeFileSync(
    path.join(dest, 'tsconfig.json'),
    JSON.stringify(fixtureTsconfig(options.jsHandler === true), null, 2),
  )
  fs.symlinkSync(
    path.join(pkgDir, 'node_modules'),
    path.join(dest, 'node_modules'),
  )

  return dest
}

const runTsc = (dest: string, ...flags: string[]) => {
  const res = spawnSync(tscBin, ['-p', 'tsconfig.json', ...flags], {
    cwd: dest,
    encoding: 'utf-8',
  })
  return `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
}

// No global cleanup hook on purpose. `buildFixture` removes the one directory it is
// about to write, which is the whole of what it owns — a shared `rmSync` of `fixtureRoot`
// would delete fixtures belonging to a test running beside it, and the fixture directory
// is keyed by framework and variant precisely so that two of them can be in flight at
// once.

describe('shipped contract layer type-checks', () => {
  it('has the compiler and utility-types source where we expect them', () => {
    expect(fs.existsSync(tscBin), `missing tsc at ${tscBin}`).toBe(true)
    expect(fs.existsSync(utilityTypesSrc), `missing ${utilityTypesSrc}`).toBe(
      true,
    )
    // A `paths` entry pointing at a file that moved would be a silent false pass: the
    // specifier resolves to nothing, and `skipLibCheck` keeps the error out of the output.
    expect(
      fs.existsSync(tealinaUtilityTypesSrc),
      `missing ${tealinaUtilityTypesSrc}`,
    ).toBe(true)
  })

  for (const fw of FRAMEWORKS) {
    it(`${fw}: types + access + api/v1 compile and project correctly`, async () => {
      const dest = await buildFixture(fw)
      const output = runTsc(dest)
      expect(output, `tsc reported:\n${output}`).toBe('')
    })
  }

  for (const fw of FRAMEWORKS) {
    // The self-check. A probe that cannot fail is not a gate, and the failure it exists
    // to catch — a projection that quietly becomes `never` — is invisible in the output
    // of the test above. So: break it on purpose, and insist the compiler notices.
    it(`${fw}: the probe still fails when the projection is broken`, async () => {
      const dest = await buildFixture(fw, { access: WIDENED_ACCESS })
      const output = runTsc(dest)
      expect(
        output,
        'the probe compiled against a deliberately widened access module — it is no ' +
          `longer able to detect a projection that degrades to \`never\`:\n${output}`,
      ).toContain('TS2322')
    })
  }

  for (const fw of FRAMEWORKS) {
    // The migration shape: a project keeps a `.js` handler beside its `.ts` ones, turns
    // on `allowJs`/`checkJs`, and sets `sourceExt: '.js'`. The generator has to emit
    // JSDoc, not `import type`; the compiler has to accept the annotated `async` arrow.
    it(`${fw}: a JSDoc-annotated .js handler compiles beside the .ts ones`, async () => {
      const dest = await buildFixture(fw, { jsHandler: true })
      const output = runTsc(dest)
      expect(output, `tsc reported:\n${output}`).toBe('')
    })
  }

  // Second self-check: express's alias repeats its call signature, and that repetition is
  // what lets an annotated `async` `.js` handler through. The alias's single signature
  // returns `unknown`, which makes the compiler demand a returned value from the async
  // function (TS2355). Strip the repetition and the migration shape has to stop
  // compiling. If this passes, the repetition is no longer load-bearing.
  //
  // Express only: fastify's return type already includes a promise, and koa's returns
  // `void`, and the compiler accepts an `async` handler against both without a second
  // signature. Asserting a failure there would be asserting the opposite of what happens.
  it('express: the async .js handler stops compiling without the repeated signature', async () => {
    const dest = await buildFixture('express', {
      jsHandler: true,
      dropOverload: true,
    })
    const output = runTsc(dest)
    expect(
      output,
      'the .js handler compiled with the second call signature removed from ' +
        'types/alias.d.ts — the single-signature alias is accepted, so this fixture ' +
        `can no longer tell whether the repetition does anything:\n${output}`,
    ).toContain('legacy.js')
    expect(output, 'the failure is not the missing return value').toContain(
      'TS2355',
    )
  })

  for (const fw of FRAMEWORKS) {
    // The blind spot. Every tsconfig the templates ship sets `skipLibCheck: true`, which
    // is also what `buildFixture` writes, so nothing else here can see an error written
    // inside `types/**/*.d.ts` — and `types/` is where this project's own handlers read
    // their aliases from. Off, the compiler reads the contract layer too.
    it(`${fw}: the contract layer is clean with skipLibCheck off`, async () => {
      const dest = await buildFixture(fw, { key: 'libcheck' })
      const output = runTsc(dest, '--skipLibCheck', 'false')
      expect(output, `tsc reported inside the contract layer:\n${output}`).toBe(
        '',
      )
    })
  }
})

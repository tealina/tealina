import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import jsTemplate from '../template/common/js/tealina.config.js'
import { PROBE_JS, PROBE_TS, WIDENED_CONVENTION } from './probe.js'

/**
 * T1 — the cheap "does it actually compile" gate.
 *
 * Copies the shipped contract subtree (types + convention + the marker the demos import
 * + api-v1 demos) into a scratch project and type-checks it. No install and no network:
 * the compiler and the framework types both come from this package's own devDependencies,
 * so this runs in a couple of seconds and is safe to leave on by default.
 *
 * The compiler is the one the *template* pins (`typescript: ~5.8.3` in
 * `template/server/<fw>/package.json`), not whatever the repo root happens to have, and
 * that is the point: everything the JavaScript trees rely on — `@typedef` with `<const T>`,
 * a JSDoc `@type` above a `const` being accepted for an `async` arrow — is compiler
 * behaviour, so a version nobody installs would be a gate over nothing.
 *
 * The probes themselves live in `test/probe.ts`, shared with T5; read the note there for
 * why the JavaScript one is written the way it is and why the JS arm runs twice.
 *
 * Three things the plain gate above cannot see, each with its own test below: the stub
 * `align` generates (a string no other test ever compiles), the global namespace the JS
 * handlers read their types from (deleting it has to be noticed), and the inside of the
 * contract layer's own `.d.ts` files — every tsconfig in this repo sets `skipLibCheck`,
 * so an error written in `types/` is invisible to every other gate here.
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

type Mode = 'ts' | 'js'

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
  baseUrl: '.',
  // Point at the source so this test does not depend on `pnpm build` having run first.
  paths: {
    '@tealina/utility-types': [utilityTypesSrc],
    'tealina/utility-types': [tealinaUtilityTypesSrc],
  },
}

const fixtureTsconfig = (mode: Mode) => ({
  compilerOptions:
    mode === 'js'
      ? { ...baseCompilerOptions, allowJs: true, checkJs: true }
      : baseCompilerOptions,
  include:
    mode === 'js'
      ? ['types/**/*.d.ts', 'src/**/*.js', 'probe.js']
      : ['types/**/*.d.ts', 'src/**/*.ts', 'probe.ts'],
})

type BuildOptions = {
  /** Replaces `src/convention.<ext>` after the tree has been copied. */
  convention?: string
  /** Deletes the JS handlers' global namespace from `types/handler.d.ts`. */
  stripGlobals?: boolean
  /** Names the scratch directory, for a variant that differs only in how it is run. */
  key?: string
}

/**
 * Where the JS handlers get `Tealina.Open` / `Tealina.Authed` / `EmptyObj` from. Both the
 * mutation below and the drift test key off this string, so it is kept in one piece.
 */
const GLOBAL_NAMESPACE_MARKER =
  '// delta vs create-tealina: a global namespace for JavaScript handlers'

function buildFixture(fw: Framework, mode: Mode, options: BuildOptions = {}) {
  const variant = options.convention
    ? '-mut'
    : options.stripGlobals
      ? '-strip'
      : options.key
        ? `-${options.key}`
        : ''
  const dest = path.join(fixtureRoot, `${fw}-${mode}${variant}`)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true })

  const copyInto = (src: string, destDir: string) =>
    fs.cpSync(src, destDir, { recursive: true })

  copyInto(path.join(templateDir, 'common/types'), path.join(dest, 'types'))
  copyInto(
    path.join(templateDir, `server/${fw}/types`),
    path.join(dest, 'types'),
  )
  // The type files are shared with the TypeScript tree, so this one line covers both
  // modes' `types/`: the mode only decides the extension of the *value* files below.
  const tree = mode === 'js' ? `server/${fw}-js` : `server/${fw}`
  const ext = mode === 'js' ? 'js' : 'ts'
  copyInto(
    path.join(templateDir, `${tree}/src/api-v1`),
    path.join(dest, 'src/api-v1'),
  )
  fs.copyFileSync(
    path.join(templateDir, `${tree}/src/convention.${ext}`),
    path.join(dest, `src/convention.${ext}`),
  )
  // The demos import the public-route marker from here. Only `openHandler` comes along:
  // it is self-contained, while its neighbour `verifyToken` belongs to the running app
  // (it answers 401 itself), and this fixture is the contract layer, not the app.
  copyInto(
    path.join(
      templateDir,
      `${tree}/src/app/middlewares/auth/openHandler.${ext}`,
    ),
    path.join(dest, `src/app/middlewares/auth/openHandler.${ext}`),
  )
  if (options.convention != null) {
    fs.writeFileSync(
      path.join(dest, `src/convention.${ext}`),
      options.convention,
    )
  }
  // The stub `align` writes is a string, and nothing else compiles it: the e2e suite runs
  // `align` but never type-checks what came out, so a type name the generator gets wrong
  // would ship unnoticed. It goes next to the hand-written handlers, at the same depth, so
  // the `../..` it is handed here is the one it gets in a real project.
  if (mode === 'js') {
    const [entry] = jsTemplate.template.handlers
    if (typeof entry?.generateFn !== 'function') {
      throw new Error(
        'the JS template config no longer exposes template.handlers[0].generateFn — ' +
          'the generated stub has stopped being compiled by anything',
      )
    }
    fs.writeFileSync(
      path.join(dest, 'src/api-v1/post/generated.js'),
      entry.generateFn({ relative2api: '../..' }),
    )
  }
  if (options.stripGlobals) {
    const contract = path.join(dest, 'types/handler.d.ts')
    const src = fs.readFileSync(contract, 'utf-8')
    const at = src.indexOf(GLOBAL_NAMESPACE_MARKER)
    // Throwing rather than tolerating: if the marker text moves, this mutation would
    // quietly delete nothing and the test below would pass for the wrong reason.
    if (at < 0) {
      throw new Error(`${contract} no longer contains the namespace marker`)
    }
    fs.writeFileSync(contract, src.slice(0, at))
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
  fs.writeFileSync(
    path.join(dest, `probe.${ext}`),
    mode === 'js' ? PROBE_JS : PROBE_TS,
  )
  fs.writeFileSync(
    path.join(dest, 'tsconfig.json'),
    JSON.stringify(fixtureTsconfig(mode), null, 2),
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
// is keyed by framework and mode precisely so that two of them can be in flight at once.

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

  for (const mode of ['ts', 'js'] as const) {
    for (const fw of FRAMEWORKS) {
      it(`${fw} (${mode}): types + convention + api-v1 compile and project correctly`, () => {
        const dest = buildFixture(fw, mode)
        const output = runTsc(dest)
        expect(output, `tsc reported:\n${output}`).toBe('')
      })
    }
  }

  for (const fw of FRAMEWORKS) {
    // The self-check. A probe that cannot fail is not a gate, and the failure it exists
    // to catch — a projection that quietly becomes `never` — is invisible in the output
    // of the test above. So: break it on purpose, and insist the compiler notices.
    it(`${fw} (js): the probe still fails when the projection is broken`, () => {
      const dest = buildFixture(fw, 'js', { convention: WIDENED_CONVENTION })
      const output = runTsc(dest)
      expect(
        output,
        'the JS probe compiled against a deliberately widened convention — it is no ' +
          `longer able to detect a projection that degrades to \`never\`:\n${output}`,
      ).toContain('TS2322')
    })
  }

  for (const fw of FRAMEWORKS) {
    // Second self-check, for the other load-bearing name. `Tealina.Open` is the one type
    // in a JS handler that resolves without an import, so the test above would keep
    // passing if the namespace it comes from were deleted and every handler fell back to
    // `any` — a JS file with no annotations still compiles. Delete it and insist on being
    // told. TS2503 specifically, not an error count: `EmptyObj` goes missing in the same
    // edit and brings its own TS2304 along.
    it(`${fw} (js): the handlers stop compiling without the global namespace`, () => {
      const dest = buildFixture(fw, 'js', { stripGlobals: true })
      const output = runTsc(dest)
      expect(
        output,
        'the JS handlers compiled with `declare global` removed from ' +
          'types/handler.d.ts — the types they name are resolving to something, so ' +
          `this fixture can no longer tell a real handler type from \`any\`:\n${output}`,
      ).toContain('TS2503')
    })
  }

  for (const fw of FRAMEWORKS) {
    // The blind spot. Every tsconfig the templates ship sets `skipLibCheck: true`, which
    // is also what `buildFixture` writes, so nothing else here can see an error written
    // inside `types/**/*.d.ts` — and `types/` is where this project's own JSDoc handlers
    // read their aliases from. Off, the compiler reads the contract layer too.
    it(`${fw} (js): the contract layer is clean with skipLibCheck off`, () => {
      const dest = buildFixture(fw, 'js', { key: 'libcheck' })
      const output = runTsc(dest, '--skipLibCheck', 'false')
      expect(output, `tsc reported inside the contract layer:\n${output}`).toBe(
        '',
      )
    })
  }
})

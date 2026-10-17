import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import tsTemplate from '../template/common/api-v1/tealina.config.js'
import { PROBE_JS, PROBE_TS, WIDENED_ACCESS } from './probe.js'

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
 * that is the point: everything the JavaScript trees rely on — `@typedef` with `<const T>`,
 * a JSDoc `@type` above a `const` being accepted for an `async` arrow — is compiler
 * behaviour, so a version nobody installs would be a gate over nothing.
 *
 * The probes themselves live in `test/probe.ts`, shared with T5; read the note there for
 * why the JavaScript one is written the way it is and why the JS arm runs twice.
 *
 * Three things the plain gate above cannot see, each with its own test below: the stub
 * `align` generates (a string no other test ever compiles), the globals the JS handlers
 * read their types from (deleting them has to be noticed), and the inside of the
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
  // No `baseUrl`: `paths` has resolved relative to the tsconfig without it since TS 4.1,
  // and TS 6 rejects the option outright (TS5101).
  // Point at the source so this test does not depend on `pnpm build` having run first.
  paths: {
    '@tealina/utility-types': [utilityTypesSrc],
    'tealina/utility-types': [tealinaUtilityTypesSrc],
  },
}

const fixtureTsconfig = (mode: Mode) => ({
  compilerOptions:
    mode === 'js'
      ? {
          ...baseCompilerOptions,
          allowJs: true,
          checkJs: true,
          paths: { ...baseCompilerOptions.paths, ...corePaths(mode) },
        }
      : {
          ...baseCompilerOptions,
          paths: { ...baseCompilerOptions.paths, ...corePaths(mode) },
        },
  include:
    mode === 'js'
      ? [
          'core/types/**/*.d.ts',
          'types/**/*.d.ts',
          'core/src/**/*.js',
          'src/**/*.js',
          'probe.js',
        ]
      : [
          'core/types/**/*.d.ts',
          'types/**/*.d.ts',
          'core/src/**/*.ts',
          'src/**/*.ts',
          'probe.ts',
        ],
})

/**
 * The `core` package's public entries, mapped into the fixture.
 *
 * A real project installs the package and resolves these through its `exports` map; the
 * fixture has no install, so it points at the same three files directly. The specifiers are
 * the published ones, which is what makes this a test of the seam rather than of a path.
 */
const corePaths = (mode: Mode) => ({
  'core/handler': ['./core/types/handler.d.ts'],
  'core/common': ['./core/types/common.d.ts'],
  'core/access': [`./core/src/access/index.${mode === 'js' ? 'js' : 'ts'}`],
})

type BuildOptions = {
  /** Replaces `core/src/access/index.<ext>` after the tree has been copied. */
  access?: string
  /** Deletes the JS handlers' global aliases from `core/types/handler.d.ts`. */
  stripGlobals?: boolean
  /** Strips the JavaScript tree's repeated call signature from `core/types/alias.d.ts`. */
  dropOverload?: boolean
  /** Names the scratch directory, for a variant that differs only in how it is run. */
  key?: string
}

/**
 * Where the JS handlers get `OpenAPI` / `AuthedAPI` / `EmptyObj` from. The mutation below
 * keys off this string, so it is kept in one piece.
 */
const GLOBAL_NAMESPACE_MARKER = '// Aliases for JavaScript handlers.'

/**
 * The JavaScript config, loaded from a directory where its `./version.js` import resolves.
 *
 * At scaffold time the config is copied to the api package's root, beside `version.js`;
 * in the template it sits in `common/js/`, which has no such sibling. Importing it in
 * place would fail on that one specifier, so the test rebuilds the destination shape —
 * two files in one directory — and imports that. Nothing else about what runs changes.
 */
let jsConfigPromise:
  | Promise<{ template?: { handlers?: { generateFn?: unknown }[] } }>
  | undefined
const loadJsConfig = () => {
  jsConfigPromise ??= (async () => {
    const dir = path.join(fixtureRoot, '_config-js')
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
    fs.copyFileSync(
      path.join(templateDir, 'common/js/api-v1/tealina.config.js'),
      path.join(dir, 'tealina.config.js'),
    )
    fs.copyFileSync(
      path.join(templateDir, 'common/api-v1/version.js'),
      path.join(dir, 'version.js'),
    )
    return (
      await import(pathToFileURL(path.join(dir, 'tealina.config.js')).href)
    ).default
  })()
  return jsConfigPromise
}

async function buildFixture(
  fw: Framework,
  mode: Mode,
  options: BuildOptions = {},
): Promise<string> {
  const variant = options.access
    ? '-mut'
    : options.stripGlobals
      ? '-strip'
      : options.dropOverload
        ? '-no-overload'
        : options.key
          ? `-${options.key}`
          : ''
  const dest = path.join(fixtureRoot, `${fw}-${mode}${variant}`)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(path.join(dest, 'src'), { recursive: true })

  const copyInto = (src: string, destDir: string) =>
    fs.cpSync(src, destDir, { recursive: true })

  // The contract layer's shared half comes from the TypeScript tree; `alias.d.ts` comes
  // from the mode's own tree, because the JavaScript copy carries a second call
  // signature. The mode only decides the extension of the *value* files below.
  const tree = mode === 'js' ? `core/${fw}-js` : `core/${fw}`
  const apiTree = mode === 'js' ? `api-v1/${fw}-js` : `api-v1/${fw}`
  const ext = mode === 'js' ? 'js' : 'ts'
  copyInto(
    path.join(templateDir, 'common/core/types'),
    path.join(dest, 'core/types'),
  )
  copyInto(
    path.join(templateDir, `${tree}/types`),
    path.join(dest, 'core/types'),
  )
  if (fw === 'fastify') {
    // Shared by both modes and sourced from the TypeScript tree, exactly as the manifest
    // does it: the `-js` tree has no `fastify.d.ts` of its own.
    fs.copyFileSync(
      path.join(templateDir, 'core/fastify/types/fastify.d.ts'),
      path.join(dest, 'core/types/fastify.d.ts'),
    )
  }
  copyInto(
    path.join(templateDir, `${tree}/src/access`),
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
        "the JavaScript tree's types/alias.d.ts no longer carries the repeated " +
          'signature, so this variant would quietly test nothing',
      )
    }
    fs.writeFileSync(alias, src.slice(0, start) + src.slice(end))
  }
  copyInto(
    path.join(templateDir, `${apiTree}/src/api`),
    path.join(dest, 'src/api'),
  )
  // The whole module over `core`, guard and all: `access/index` imports `verifyToken`,
  // which is the point of the two sitting together. The guard's 401 branch is app behaviour
  // this fixture never runs; `tsc` only has to be able to read it.
  if (options.access != null) {
    fs.writeFileSync(
      path.join(dest, `core/src/access/index.${ext}`),
      options.access,
    )
  }
  // The stub `align` writes is a string, and nothing else compiles it: the e2e suite runs
  // `align` but never type-checks what came out, so a type name the generator gets wrong
  // would ship unnoticed. It goes next to the hand-written handlers, and it is handed that
  // directory the way the CLI hands it — the stub's imports are resolved from there, so a
  // generator that assumes a depth instead of measuring one fails here.
  //
  // Both configs are compiled, not only the one this fixture's mode ships. They work their
  // paths out separately, in two trees that share no code, so a depth one of them gets
  // wrong is a stub that only breaks in a project nobody ran this on.
  const [entry] =
    (mode === 'js' ? await loadJsConfig() : tsTemplate).template?.handlers ?? []
  const generateFn = entry?.generateFn
  if (typeof generateFn !== 'function') {
    throw new Error(
      `the ${mode} template config no longer exposes template.handlers[0].generateFn — ` +
        'the generated stub has stopped being compiled by anything',
    )
  }
  // The shipped stubs read only `fileDir`, but `TemplateContext` is what the generator
  // hands a real config, so the rest is filled in rather than cast away.
  fs.writeFileSync(
    path.join(dest, `src/api/post/generated.${ext}`),
    generateFn({
      filename: 'generated',
      Filename: 'Generated',
      fileDir: 'src/api/post',
      method: 'post',
    }),
  )
  if (options.stripGlobals) {
    const contract = path.join(dest, 'core/types/handler.d.ts')
    const src = fs.readFileSync(contract, 'utf-8')
    const at = src.indexOf(GLOBAL_NAMESPACE_MARKER)
    // Throwing rather than tolerating: if the marker text moves, this mutation would
    // quietly delete nothing and the test below would pass for the wrong reason.
    if (at < 0) {
      throw new Error(`${contract} no longer contains the namespace marker`)
    }
    // The slice below drops everything from the marker to EOF, so the only thing allowed
    // between the two is that comment. A declaration in between would be deleted with the
    // block, and this test — which asserts nothing more than the appearance of TS2304 —
    // would not go red for it, only weaker in a way nothing else measures.
    const blockAt = src.indexOf('\ndeclare global {', at)
    if (blockAt < 0) {
      throw new Error(`${contract} has no global block after the marker`)
    }
    const between = src.slice(at + GLOBAL_NAMESPACE_MARKER.length, blockAt)
    if (!between.split('\n').every(line => /^\s*(\/\/.*)?$/.test(line))) {
      throw new Error(`${contract} declares something before its global block`)
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
      it(`${fw} (${mode}): types + access + api/v1 compile and project correctly`, async () => {
        const dest = await buildFixture(fw, mode)
        const output = runTsc(dest)
        expect(output, `tsc reported:\n${output}`).toBe('')
      })
    }
  }

  for (const fw of FRAMEWORKS) {
    // The self-check. A probe that cannot fail is not a gate, and the failure it exists
    // to catch — a projection that quietly becomes `never` — is invisible in the output
    // of the test above. So: break it on purpose, and insist the compiler notices.
    it(`${fw} (js): the probe still fails when the projection is broken`, async () => {
      const dest = await buildFixture(fw, 'js', { access: WIDENED_ACCESS })
      const output = runTsc(dest)
      expect(
        output,
        'the JS probe compiled against a deliberately widened access module — it is no ' +
          `longer able to detect a projection that degrades to \`never\`:\n${output}`,
      ).toContain('TS2322')
    })
  }

  for (const fw of FRAMEWORKS) {
    // Second self-check, for the other load-bearing name. `OpenAPI` is the one type in a
    // JS handler that resolves without an import, so the test above would keep passing if
    // the global block it comes from were deleted and every handler fell back to `any` —
    // a JS file with no annotations still compiles. Delete it and insist on being told.
    // TS2304 specifically, not an error count: `EmptyObj` goes missing in the same edit
    // and brings its own TS2304 along.
    it(`${fw} (js): the handlers stop compiling without the global aliases`, async () => {
      const dest = await buildFixture(fw, 'js', { stripGlobals: true })
      const output = runTsc(dest)
      expect(
        output,
        'the JS handlers compiled with `declare global` removed from ' +
          'types/handler.d.ts — the types they name are resolving to something, so ' +
          `this fixture can no longer tell a real handler type from \`any\`:\n${output}`,
      ).toContain('TS2304')
    })
  }

  for (const fw of FRAMEWORKS) {
    // Third self-check, for the JavaScript tree's one difference from the TypeScript
    // tree. Its `types/alias.d.ts` repeats the call signature; strip the repetition and
    // every async handler has to be rejected. If this passes, the file the manifest ships
    // is no longer the thing keeping the JS tree compiling.
    it(`${fw} (js): the async handlers stop compiling without the repeated signature`, async () => {
      const dest = await buildFixture(fw, 'js', { dropOverload: true })
      const output = runTsc(dest)
      expect(
        output,
        'the JS handlers compiled with the second call signature removed from ' +
          'types/alias.d.ts — the single-signature alias is accepted, so this fixture ' +
          `can no longer tell whether the repetition does anything:\n${output}`,
      ).toContain('TS1065')
    })
  }

  for (const fw of FRAMEWORKS) {
    // The blind spot. Every tsconfig the templates ship sets `skipLibCheck: true`, which
    // is also what `buildFixture` writes, so nothing else here can see an error written
    // inside `types/**/*.d.ts` — and `types/` is where this project's own JSDoc handlers
    // read their aliases from. Off, the compiler reads the contract layer too.
    it(`${fw} (js): the contract layer is clean with skipLibCheck off`, async () => {
      const dest = await buildFixture(fw, 'js', { key: 'libcheck' })
      const output = runTsc(dest, '--skipLibCheck', 'false')
      expect(output, `tsc reported inside the contract layer:\n${output}`).toBe(
        '',
      )
    })
  }
})

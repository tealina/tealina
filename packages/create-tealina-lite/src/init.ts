import chalk from 'chalk'
import minimist from 'minimist'
import fs from 'node:fs'
import path from 'node:path'
import prompts from 'prompts'
import {
  type ServerTemplate,
  formatDestDir,
  isServerTemplate,
  kServerTemplates,
  templateRootDir,
} from './core.js'

const { blue, green, yellow, reset } = chalk
const { join } = path

/**
 * A failure worth one line instead of a stack trace. `src/index.ts` prints `message`
 * and exits 1.
 */
export class InitAbort extends Error {}

// ---------------------------------------------------------------------------
// What init copies
// ---------------------------------------------------------------------------

/**
 * Out of `template/common/`, i.e. the same for every framework. Each path is relative to
 * the target package root, and is also where it sits inside `template/common/`.
 */
const kCommonInitFiles = [
  'types/handler.d.ts',
  'types/common.d.ts',
  'types/api-v1.d.ts',
  'tealina.config.ts',
  'docs/.gitkeep',
] as const

/**
 * Out of `template/server/<fw>/`. What is missing from this list matters as much as what
 * is in it:
 *
 * - `src/index.ts` and `src/app/index.ts` are the scaffold's boot and app assembly. This
 *   feature never edits the host's, so it must not drop a competing pair next to them.
 * - `src/api-v1/**` is demo content (see `kEmptyApiIndex`).
 * - `tsconfig.json`, `tsconfig.build.json` and `src/config/env.ts` belong to the host —
 *   its port, its module settings, its build.
 * - `src/app/routes/static/assets.ts` serves the scaffold's placeholder page.
 *
 * `src/app/middlewares/errorHandler.ts` *is* here for express and koa, because their
 * `verifyToken.ts` imports `formatErrorResponse` from it. Copying it keeps the shipped
 * `verifyToken.ts` byte-identical to the scaffold's instead of forking a second variant.
 * It is not wired into anything — the report says so, because a file called
 * `errorHandler.ts` landing in someone's app implies otherwise.
 */
const kServerInitFiles: Record<ServerTemplate, readonly string[]> = {
  express: [
    'types/alias.d.ts',
    'src/convention.ts',
    'src/app/middlewares/auth/openHandler.ts',
    'src/app/middlewares/auth/verifyToken.ts',
    'src/app/middlewares/errorHandler.ts',
    'src/app/routes/api/index.ts',
    'src/app/routes/api/v1.ts',
    'src/app/routes/static/doc.ts',
  ],
  koa: [
    'types/alias.d.ts',
    'src/convention.ts',
    'src/app/middlewares/auth/openHandler.ts',
    'src/app/middlewares/auth/verifyToken.ts',
    'src/app/middlewares/errorHandler.ts',
    'src/app/routes/api/index.ts',
    'src/app/routes/api/v1.ts',
    'src/app/routes/static/docs.ts',
  ],
  fastify: [
    'types/alias.d.ts',
    'types/fastify.d.ts',
    'src/convention.ts',
    'src/app/middlewares/auth/openHandler.ts',
    'src/app/middlewares/auth/verifyToken.ts',
    'src/app/routes/api/index.ts',
    'src/app/routes/api/v1.ts',
    'src/app/routes/static/docs.ts',
  ],
}

/** The one file `init` writes rather than copies. */
const kApiIndex = 'src/api-v1/index.ts'

/**
 * Deliberately empty. A demo endpoint dropped into a project that already has routes is a
 * route nobody asked for, and it can collide with a real path. This exists so
 * `types/api-v1.d.ts`'s `import apis from '../src/api-v1/index.js'` resolves — with an
 * empty record `ApiTypesForDoc` degrades to `{}`, not to `never`. The first `align`
 * overwrites it.
 */
const kEmptyApiIndex = 'export default {}\n'

/**
 * Every file `init` writes for `fw`, as template-relative `src` → package-relative `dest`.
 *
 * Exported because test/init-manifest.test.ts holds two invariants over this list that
 * cannot be checked from the outside: every `src` exists, and every relative import
 * inside the set lands back inside the set.
 */
export const initFiles = (fw: ServerTemplate) =>
  [
    ...kCommonInitFiles.map(rel => ({ src: `common/${rel}`, dest: rel })),
    ...kServerInitFiles[fw].map(rel => ({
      src: `server/${fw}/${rel}`,
      dest: rel,
    })),
  ] satisfies { src: string; dest: string }[]

// ---------------------------------------------------------------------------
// Reading the host project
// ---------------------------------------------------------------------------

/** The runtime package a framework's type definitions hang off. */
const kFrameworkPkg: Record<ServerTemplate, string> = {
  express: 'express',
  fastify: 'fastify',
  koa: 'koa',
}

const kFrameworkTitle: Record<ServerTemplate, string> = {
  express: 'Express',
  fastify: 'Fastify',
  koa: 'Koa',
}

/**
 * Dependencies `init` will not add even when they are missing. Swapping someone's compiler
 * or their dev runner is not part of installing a routing convention; the report names
 * them instead so the user can decide.
 */
const kToolchainOnly = new Set(['typescript', 'tsx'])

type PackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
  exports?: Record<string, unknown>
}

const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(file, 'utf-8')) as T

/** A merged file keeps the indentation and trailing newline the host already used. */
const writeJsonLike = (file: string, value: unknown, before: string) => {
  const indent = before.match(/^\{\n(\s+)"/m)?.[1] ?? '  '
  const out = JSON.stringify(value, null, indent)
  fs.writeFileSync(file, before.endsWith('\n') ? `${out}\n` : out)
}

const detectFrameworks = (pkg: PackageJson): ServerTemplate[] => {
  const declared = { ...pkg.dependencies, ...pkg.devDependencies }
  return kServerTemplates.filter(fw => declared[kFrameworkPkg[fw]] != null)
}

const askFramework = async (
  found: ServerTemplate[],
): Promise<ServerTemplate> => {
  const choices = (found.length > 0 ? found : kServerTemplates).map(fw => ({
    title: kFrameworkTitle[fw],
    value: fw,
  }))
  const { server } = (await prompts(
    [
      {
        message: reset('Select a server framework:'),
        name: 'server',
        type: 'select' as const,
        choices,
      },
    ],
    {
      onCancel: () => {
        throw 'Canceled'
      },
    },
  )) as { server?: ServerTemplate }
  if (server == null) throw 'Canceled'
  return server
}

/**
 * The contract layer resolves `./x.js` to `./x.ts` and compiles `types/**`. Both are
 * properties of the host's tsconfig, which this feature never writes, so it looks and
 * reports rather than edits.
 *
 * Matching on the raw text instead of parsing on purpose: a real tsconfig carries comments
 * and trailing commas (the scaffold's own does), and guessing wrong at what a config
 * *means* — `extends`, glob `include` — is worse than saying nothing.
 */
const tsconfigNotes = (targetDir: string): string[] => {
  const file = join(targetDir, 'tsconfig.json')
  if (!fs.existsSync(file)) {
    return [
      'No tsconfig.json here — the files just added are TypeScript, so this package needs one.',
    ]
  }
  const raw = fs.readFileSync(file, 'utf-8')
  const resolution = raw.match(/"moduleResolution"\s*:\s*"([^"]+)"/)?.[1]
  const module = raw.match(/"module"\s*:\s*"([^"]+)"/)?.[1]
  const bad = ['node', 'node10', 'classic']
  if (resolution != null && bad.includes(resolution)) {
    return [
      `tsconfig moduleResolution is "${resolution}", which does not map './x.js' to ` +
        "'./x.ts'. Set it to NodeNext or Bundler.",
    ]
  }
  if (
    resolution == null &&
    module != null &&
    ['commonjs', 'node10'].includes(module)
  ) {
    return [
      `tsconfig module is "${module}" with no moduleResolution, which resolves to the ` +
        "old node algorithm: './x.js' will not find './x.ts'. Set moduleResolution to " +
        'NodeNext or Bundler.',
    ]
  }
  return []
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

const copyInto = (src: string, dest: string) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

type MergeReport = {
  added: string[]
  kept: string[]
  scripts: string[]
  skippedScripts: string[]
  toolchain: string[]
  exportsEntry: boolean
  exportsField: boolean
}

/**
 * Merges into the host's `package.json` and never overwrites a key it finds. The three
 * scripts and the dependencies come from the framework's own template manifest rather
 * than from a list here, so they cannot drift from what the scaffold ships.
 */
const mergePackageJson = (
  pkgPath: string,
  pkg: PackageJson,
  fw: ServerTemplate,
  before: string,
): MergeReport => {
  const template = readJson<PackageJson>(
    join(templateRootDir, 'server', fw, 'package.json'),
  )
  const report: MergeReport = {
    added: [],
    kept: [],
    scripts: [],
    skippedScripts: [],
    toolchain: [],
    exportsEntry: false,
    exportsField: pkg.exports != null,
  }

  for (const field of ['dependencies', 'devDependencies'] as const) {
    pkg[field] ??= {}
    const target = pkg[field]
    for (const [name, range] of Object.entries(template[field] ?? {})) {
      if (target[name] != null) {
        report.kept.push(name)
        continue
      }
      if (kToolchainOnly.has(name)) {
        report.toolchain.push(name)
        continue
      }
      target[name] = range
      report.added.push(name)
    }
  }

  pkg.scripts ??= {}
  for (const name of ['v1', 'gdoc', 'align']) {
    const command = template.scripts?.[name]
    if (command == null) continue
    if (pkg.scripts[name] != null) {
      report.skippedScripts.push(name)
      continue
    }
    pkg.scripts[name] = command
    report.scripts.push(name)
  }

  // Only merged into an `exports` map that already exists. Adding the field to a package
  // that has none seals every other deep import the package used to allow, which is a
  // breaking change to hand someone in the middle of installing a router.
  if (pkg.exports != null && pkg.exports['./api/v1'] == null) {
    pkg.exports['./api/v1'] = { types: './types/api-v1.d.ts' }
    report.exportsEntry = true
  }

  writeJsonLike(pkgPath, pkg, before)
  return report
}

/**
 * Two or three lines, per framework, that the user pastes into their own entry file. This
 * is the one step `init` cannot do for them: the entry is arbitrary code, and a codemod
 * that guesses wrong leaves a trap inside someone's app.
 */
const kMountSnippet: Record<ServerTemplate, string[]> = {
  express: [
    "import { buildApiRouter } from './app/routes/api/index.js'",
    "import { VDOC_BASENAME, docRouter } from './app/routes/static/doc.js'",
    '',
    "app.use('/api', await buildApiRouter())",
    'app.use(VDOC_BASENAME, docRouter)',
  ],
  koa: [
    "import { buildApiRouter } from './app/routes/api/index.js'",
    "import { docRouter } from './app/routes/static/docs.js'",
    '',
    'app.use((await buildApiRouter()).routes())',
    'docRouter(app)',
  ],
  fastify: [
    "import { buildApiRouter } from './app/routes/api/index.js'",
    "import { VDOC_BASENAME, docRouter } from './app/routes/static/docs.js'",
    '',
    "await fastify.register(buildApiRouter, { prefix: '/api' })",
    'fastify.register(docRouter, { prefix: VDOC_BASENAME })',
  ],
}

// ---------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------

export const runInit = async () => {
  const argv = minimist<{ template?: string; 'skip-existing'?: boolean }>(
    process.argv.slice(2),
    { string: ['_', 'template'], boolean: ['skip-existing'] },
  )
  const preset = argv.template
  if (preset != null && !isServerTemplate(preset)) {
    throw new InitAbort(
      `Unknown --template "${preset}". Expected one of: ${kServerTemplates.join(', ')}`,
    )
  }
  const presetFw =
    preset != null && isServerTemplate(preset) ? preset : undefined

  const targetDir = path.resolve(process.cwd(), formatDestDir(argv._[1] ?? '.'))
  const pkgPath = join(targetDir, 'package.json')
  if (!fs.existsSync(pkgPath)) {
    throw new InitAbort(
      `${targetDir} has no package.json, so it is not a Node package to install into.`,
    )
  }
  const pkgBefore = fs.readFileSync(pkgPath, 'utf-8')
  const pkg = JSON.parse(pkgBefore) as PackageJson

  if (fs.existsSync(join(targetDir, 'pnpm-workspace.yaml'))) {
    console.log(
      `${yellow('!')} ${targetDir} looks like a workspace root. If tealina should live in ` +
        'one of its packages, run init against that package directory instead.',
    )
  }

  // `--template` wins; otherwise a package that declares exactly one of the three answers
  // for itself, which is what keeps `init` fully non-interactive in the common case.
  const found = detectFrameworks(pkg)
  const server =
    presetFw ?? (found.length === 1 ? found[0] : await askFramework(found))

  const files = initFiles(server)
  const dests = [...files.map(f => f.dest), kApiIndex]
  const conflicts = dests.filter(rel => fs.existsSync(join(targetDir, rel)))
  const skipExisting = argv['skip-existing'] === true

  if (conflicts.length > 0 && !skipExisting) {
    throw new InitAbort(
      `${targetDir} already has ${conflicts.length} of the files this would write:\n` +
        `${conflicts.map(rel => `  ${rel}`).join('\n')}\n` +
        'Nothing was written. Re-run with --skip-existing to leave those alone and ' +
        'install around them.',
    )
  }

  const written = files
    .filter(f => !conflicts.includes(f.dest))
    .map(f => {
      // `src` is template-relative, `dest` is package-relative; they are only the same
      // string for the files that happen to sit at the same depth in both trees.
      copyInto(join(templateRootDir, f.src), join(targetDir, f.dest))
      return f.dest
    })
  if (!conflicts.includes(kApiIndex)) {
    fs.mkdirSync(path.dirname(join(targetDir, kApiIndex)), { recursive: true })
    fs.writeFileSync(join(targetDir, kApiIndex), kEmptyApiIndex)
    written.push(kApiIndex)
  }

  const merge = mergePackageJson(pkgPath, pkg, server, pkgBefore)
  const notes = tsconfigNotes(targetDir)

  // -------------------------------------------------------------------------
  // Report
  // -------------------------------------------------------------------------
  console.log(
    `\n${green('Installed the tealina convention into')} ${targetDir}\n`,
  )
  console.log(
    `${written.length} file${written.length === 1 ? '' : 's'} written, ` +
      `${conflicts.length} left alone.`,
  )
  console.log(`Framework: ${kFrameworkTitle[server]}`)

  console.log(`\n${blue('package.json')}`)
  console.log(
    merge.added.length > 0
      ? `  added: ${merge.added.join(', ')}`
      : '  added: nothing (every dependency was already there)',
  )
  if (merge.kept.length > 0) {
    console.log(`  kept your version: ${merge.kept.join(', ')}`)
  }
  if (merge.scripts.length > 0) {
    console.log(`  added scripts: ${merge.scripts.join(', ')}`)
  }
  if (merge.skippedScripts.length > 0) {
    console.log(
      `  ${yellow('!')} scripts already taken, left as they are: ` +
        merge.skippedScripts.join(', '),
    )
  }
  if (merge.toolchain.length > 0) {
    console.log(
      `  ${yellow('!')} not added (yours to choose): ${merge.toolchain.join(', ')}`,
    )
  }
  if (merge.exportsField && merge.exportsEntry) {
    console.log('  added exports["./api/v1"] for frontend type imports')
  }
  if (!merge.exportsField) {
    console.log(
      '  exports: left alone. Add this yourself if a frontend should import the types ' +
        '(adding `exports` where there is none seals your other deep imports):\n' +
        '    "exports": { "./api/v1": { "types": "./types/api-v1.d.ts" } }',
    )
  }

  console.log(`\n${blue('Notes')}`)
  if (
    kServerInitFiles[server].includes('src/app/middlewares/errorHandler.ts')
  ) {
    console.log(
      '  src/app/middlewares/errorHandler.ts came along only because verifyToken ' +
        'imports its formatter. It is NOT wired into your app.',
    )
  }
  console.log(
    '  src/api-v1/ starts empty: no demo endpoints were added, so no route you did ' +
      'not write is being served.',
  )
  for (const note of notes) console.log(`  ${yellow('!')} ${note}`)

  console.log(`\n${blue('Now run:')}`)
  console.log(`  1. install the new dependencies (at your workspace root)`)
  console.log(
    '  2. mount the router in your entry file, before any 404 handler:',
  )
  for (const line of kMountSnippet[server]) {
    console.log(line === '' ? '' : `       ${line}`)
  }
  console.log('  3. create your first endpoint, then rebuild the route table:')
  console.log('       npm run v1 post/foo  &&  npm run align')
  console.log(
    '  4. generate the API document, which the doc page reads from disk:',
  )
  console.log('       npm run gdoc')
  console.log('')
}

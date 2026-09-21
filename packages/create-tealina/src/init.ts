import chalk from 'chalk'
import minimist from 'minimist'
import fs from 'node:fs'
import path from 'node:path'
import prompts from 'prompts'
import versionMap from '../template/versionMaps.json'
import {
  type ServerTemplate,
  formatDestDir,
  isServerTemplate,
  kServerTemplates,
  templateRootDir,
} from './core.js'
import {
  type Mode,
  frameworkInitFiles,
  initFiles,
  webHostFiles,
} from './template-manifest.js'

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

/** The one file `init` writes rather than copies. */
const apiIndex = (mode: Mode) =>
  `src/api-v1/index${mode === 'js' ? '.js' : '.ts'}`

/**
 * Deliberately empty. A demo endpoint dropped into a project that already has routes is a
 * route nobody asked for, and it can collide with a real path. This exists so
 * `types/api-v1.d.ts`'s `import apis from '../src/api-v1/index.js'` resolves — with an
 * empty record `ApiTypesForDoc` degrades to `{}`, not to `never`. The first `align`
 * overwrites it.
 */
const kEmptyApiIndex = 'export default {}\n'

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
 *
 * The two modes disagree about whether `typescript` belongs on this list, and the reason is
 * not a preference. In a TypeScript project it is the compiler, and the host already has
 * one they chose. In a JavaScript project it is never the compiler — nothing is compiled —
 * but it is a hard `peerDependency` of `tealina`, because `gdoc` reads the sources through
 * the TypeScript compiler API. Skipping it there would install a routing convention whose
 * documentation command cannot start.
 *
 * `tsx` is skipped either way: it is a development runner, and a JavaScript project runs
 * its own files with `node`.
 */
const kToolchainOnly: Record<Mode, ReadonlySet<string>> = {
  ts: new Set(['typescript', 'tsx']),
  js: new Set(['tsx']),
}

type PackageJson = {
  /** Read, never written: `init` leaves the host's identity alone. */
  name?: string
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
const tsconfigNotes = (targetDir: string, mode: Mode): string[] => {
  const file = join(targetDir, 'tsconfig.json')
  if (!fs.existsSync(file)) {
    return mode === 'js'
      ? [
          'No tsconfig.json here. These are JavaScript files and nothing compiles them, ' +
            'but `gdoc` reads them through the TypeScript compiler, which needs one with ' +
            '"allowJs": true. Re-run with --write-tsconfig to have one written.',
        ]
      : [
          'No tsconfig.json here — the files just added are TypeScript, so this package ' +
            'needs one. Re-run with --write-tsconfig to have one written.',
        ]
  }
  const raw = fs.readFileSync(file, 'utf-8')

  if (mode === 'js') {
    const notes: string[] = []
    // The load-bearing setting, and the reason this whole check exists. Without it the
    // compiler does not resolve `.js` imports at all, so `gdoc` cannot see the handlers —
    // and it fails in the quiet direction: the API document comes out empty or wrong
    // rather than the command reporting anything about the configuration.
    if (!/"allowJs"\s*:\s*true/.test(raw)) {
      notes.push(
        'tsconfig does not set "allowJs": true. Without it the compiler will not resolve ' +
          "the '.js' files at all, and `gdoc` cannot read the handlers — add it, and " +
          '"checkJs": true alongside to have your JSDoc checked rather than trusted.',
      )
    } else if (!/"checkJs"\s*:\s*true/.test(raw)) {
      notes.push(
        '"checkJs" is not set, so the JSDoc in this project is read but never checked. ' +
          'Recommended, not required.',
      )
    }
    return notes
  }

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

/**
 * Writes the host's `tsconfig.json` — but only when asked, and only when there is none to
 * write over. Both halves matter. The first is the feature's promise: `init` installs
 * *around* a project and leaves what is already there alone. The second is that a tsconfig
 * is where a project's module settings live, so overwriting one would be the single most
 * disruptive thing this command could do.
 *
 * It is the same file `create` ships for the mode, so an installed project and a
 * scaffolded one start from the same configuration.
 */
const mayWriteTsconfig = (targetDir: string, mode: Mode) => {
  const file = join(targetDir, 'tsconfig.json')
  if (fs.existsSync(file)) return false
  copyInto(
    join(
      templateRootDir,
      mode === 'js' ? 'common/js/tsconfig.json' : 'common/tsconfig.json',
    ),
    file,
  )
  return true
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
  mode: Mode,
  before: string,
): MergeReport => {
  const template = readJson<PackageJson>(
    join(
      templateRootDir,
      'server',
      mode === 'js' ? `${fw}-js` : fw,
      'package.json',
    ),
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
      if (kToolchainOnly[mode].has(name)) {
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
// The frontend, when it is asked for
// ---------------------------------------------------------------------------

/**
 * Where the web package goes: beside the host, never inside it.
 *
 * Inside would be simpler and wrong. `server: workspace:*` is the whole mechanism — the
 * host's `.d.ts` reaches the web package through a workspace link and its `exports` map —
 * and a workspace link is between packages, not directories. A `web/` inside the host
 * package would be a second package.json in one package.
 */
const webDestOf = (targetDir: string) => join(path.dirname(targetDir), 'web')

/**
 * The three strings in the web tree that name the host package, and the only things this
 * rewrites. A substitution rather than a codemod: everything else in the tree is written
 * to be package-agnostic, so a host called `server` — which is what `create` names it —
 * comes out byte-for-byte as the template has it.
 */
const withHostName = (source: string, hostName: string) =>
  source
    .replaceAll('server/api/v1', `${hostName}/api/v1`)
    .replaceAll('`server`', `\`${hostName}\``)
    .replaceAll('"server": "workspace:*"', `"${hostName}": "workspace:*"`)

type WebPlan = {
  destDir: string
  /** The host package's own name, which is what the web tree's three strings become. */
  hostName: string
  /** Named files that are already there. */
  conflicts: string[]
  /** Why the package should not be written at all, if there is a reason. */
  blocked: string | null
  /** A soft problem: the package is written either way. */
  warnings: string[]
}

/**
 * Everything about the frontend that can be decided before a byte is written, so that a
 * refusal lands before the server half of this command has touched the project rather
 * than after it.
 */
const planWeb = (targetDir: string, pkg: PackageJson, mode: Mode): WebPlan => {
  const destDir = webDestOf(targetDir)
  const conflicts = webHostFiles(mode)
    .map(f => f.dest)
    .filter(rel => fs.existsSync(join(destDir, rel)))
  const warnings: string[] = []
  const common = { destDir, hostName: pkg.name ?? '', conflicts, warnings }

  // The host as the workspace root is not a style objection: `web` beside it would sit
  // outside the workspace, and the `workspace:*` link would have nothing to resolve
  // against — the one thing that makes this package more than a Vite app.
  if (fs.existsSync(join(targetDir, 'pnpm-workspace.yaml'))) {
    return {
      ...common,
      blocked:
        `${targetDir} is a workspace root. A package beside it would fall outside the ` +
        'workspace and could not link to this one. Run init against the package itself.',
    }
  }
  if (pkg.name == null) {
    return {
      ...common,
      blocked:
        'this package.json has no "name", so there is nothing to link against.',
    }
  }
  // The precondition. `mergePackageJson` adds `exports["./api/v1"]` itself when the host
  // already has an `exports` map — but it will not create the field, because doing that
  // seals every other deep import the package allows. So a host with no `exports` at all
  // is a decision for its owner, and this names the decision instead of making it.
  if (pkg.exports == null) {
    return {
      ...common,
      blocked:
        'this package does not publish its API types, so the frontend would have ' +
        'nothing to import. Adding `exports` where there is none seals every other ' +
        'deep import the package allows, so it is yours to add:\n' +
        '    "exports": { "./api/v1": { "types": "./types/api-v1.d.ts" } }\n' +
        '  Add that, then re-run with --web.',
    }
  }

  if (!fs.existsSync(join(path.dirname(destDir), 'pnpm-workspace.yaml'))) {
    warnings.push(
      `no pnpm-workspace.yaml beside ${destDir}, so "workspace:*" will not resolve. ` +
        'The frontend needs to be in the same workspace as this package.',
    )
  }
  return { ...common, blocked: null }
}

const writeWeb = (plan: WebPlan, mode: Mode, skip: boolean) => {
  const files = webHostFiles(mode)
  const written = files
    .filter(f => !(skip && plan.conflicts.includes(f.dest)))
    .map(f => {
      const dest = join(plan.destDir, f.dest)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(
        dest,
        withHostName(
          fs.readFileSync(join(templateRootDir, f.src), 'utf-8'),
          plan.hostName,
        ),
      )
      return f.dest
    })
  // The name is the directory's, like the server package's, and the version ranges come
  // from the same version map `create` merges from.
  const pkgPath = join(plan.destDir, 'package.json')
  if (written.includes('package.json')) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    pkg.name = path.basename(plan.destDir)
    Object.assign(pkg.dependencies, versionMap.web.dependencies)
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
  }
  return written
}

// ---------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------

export const runInit = async () => {
  const argv = minimist<{
    template?: string
    'skip-existing'?: boolean
    'write-tsconfig'?: boolean
    js?: boolean
    ts?: boolean
    web?: boolean
  }>(process.argv.slice(2), {
    string: ['_', 'template'],
    boolean: ['skip-existing', 'write-tsconfig', 'js', 'ts', 'web'],
  })
  if (argv.js && argv.ts) {
    throw new InitAbort('--js and --ts contradict each other; pass one.')
  }
  // TypeScript unless told otherwise. A JavaScript host is the case that needs saying out
  // loud, and guessing from `"type": "module"` would be guessing wrong about a Node
  // project that simply uses ESM.
  const mode: Mode = argv.js ? 'js' : 'ts'
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

  const indexFile = apiIndex(mode)
  const files = initFiles(server, mode)
  const dests = [...files.map(f => f.dest), indexFile]
  const conflicts = dests.filter(rel => fs.existsSync(join(targetDir, rel)))
  const skipExisting = argv['skip-existing'] === true

  // Planned here, with the same conflict arithmetic and before the same abort, so that a
  // frontend that cannot be written stops the command rather than being discovered after
  // the server half has landed. `blocked` is a different question from `conflicts` — it
  // means the package should not be written at all, whatever is on disk.
  const webPlan = argv.web === true ? planWeb(targetDir, pkg, mode) : null
  const webConflicts =
    webPlan != null && webPlan.blocked == null ? webPlan.conflicts : []

  if (conflicts.length > 0 && !skipExisting) {
    throw new InitAbort(
      `${targetDir} already has ${conflicts.length} of the files this would write:\n` +
        `${conflicts.map(rel => `  ${rel}`).join('\n')}\n` +
        'Nothing was written. Re-run with --skip-existing to leave those alone and ' +
        'install around them.',
    )
  }
  if (webConflicts.length > 0 && !skipExisting) {
    throw new InitAbort(
      `${webPlan?.destDir} already has ${webConflicts.length} of the files this would ` +
        `write:\n` +
        `${webConflicts.map(rel => `  ${rel}`).join('\n')}\n` +
        'Nothing was written. Re-run with --skip-existing to leave those alone and ' +
        'install around them.',
    )
  }

  // The other mode's tree writes to different paths, so installing it on top of this one
  // collides with nothing and this command accepts it. Both then sit in the project, and
  // only one of them is ever loaded — silently. Worth a line, because the failure mode is
  // editing the wrong copy of a handler and watching nothing change.
  //
  // Subtracting `dests` is what keeps the count honest. The contract layer is one file
  // shared by both modes, so a project that already had the TypeScript install lists
  // `types/handler.d.ts` and friends in the other mode's set too — counting those would
  // report a conflict on the files this very run just wrote, correctly, in place.
  const otherMode: Mode = mode === 'js' ? 'ts' : 'js'
  const ownDests = new Set(dests)
  const otherModeFiles = initFiles(server, otherMode)
    .map(f => f.dest)
    .filter(rel => !ownDests.has(rel) && fs.existsSync(join(targetDir, rel)))

  const written = files
    .filter(f => !conflicts.includes(f.dest))
    .map(f => {
      // `src` is template-relative, `dest` is package-relative; they are only the same
      // string for the files that happen to sit at the same depth in both trees.
      copyInto(join(templateRootDir, f.src), join(targetDir, f.dest))
      return f.dest
    })
  if (!conflicts.includes(indexFile)) {
    fs.mkdirSync(path.dirname(join(targetDir, indexFile)), { recursive: true })
    fs.writeFileSync(join(targetDir, indexFile), kEmptyApiIndex)
    written.push(indexFile)
  }

  const merge = mergePackageJson(pkgPath, pkg, server, mode, pkgBefore)
  // Written before the notes are computed, so what the notes describe is the file that is
  // now there rather than the one that was.
  const wroteTsconfig =
    argv['write-tsconfig'] === true && mayWriteTsconfig(targetDir, mode)
  const notes = tsconfigNotes(targetDir, mode)

  const webWritten =
    webPlan != null && webPlan.blocked == null
      ? writeWeb(webPlan, mode, skipExisting)
      : []

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
  console.log(
    `Framework: ${kFrameworkTitle[server]} · ` +
      `${mode === 'js' ? 'JavaScript' : 'TypeScript'}`,
  )
  if (wroteTsconfig) {
    console.log(`Wrote tsconfig.json (there was none here).`)
  }

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

  if (webPlan != null) {
    console.log(`\n${blue('frontend')}`)
    if (webPlan.blocked != null) {
      console.log(`  ${yellow('!')} --web skipped: ${webPlan.blocked}`)
    } else {
      console.log(
        `${webWritten.length} file${webWritten.length === 1 ? '' : 's'} written to ` +
          `${webPlan.destDir}` +
          (webPlan.conflicts.length > 0
            ? `, ${webPlan.conflicts.length} left alone.`
            : '.'),
      )
      for (const warning of webPlan.warnings) {
        console.log(`  ${yellow('!')} ${warning}`)
      }
    }
  }

  console.log(`\n${blue('Notes')}`)
  if (otherModeFiles.length > 0) {
    console.log(
      `  ${yellow('!')} this project already has ${otherModeFiles.length} files from the ` +
        `${otherMode === 'js' ? 'JavaScript' : 'TypeScript'} install. The two trees do not ` +
        'collide — they use different paths — but they are two copies of one convention ' +
        'and only one of them is ever loaded. The router imports api-v1/index.js, which ' +
        `plain node reads as the .js file and tsx reads as the .ts one. Delete the tree ` +
        'you are not running, or you will be editing a handler that is never called.',
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
    '  2. mount the router in your entry file, wherever your middleware ends:',
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
  // The one step that has to be done by hand, because it is a file `init` never touches:
  // the workspace root is shared, and the scripts there are the user's own.
  if (webPlan != null && webPlan.blocked == null) {
    console.log(
      `  5. to start both packages at once, add these to the workspace root:`,
    )
    console.log('       "dev": "pnpm -r --parallel dev",')
    console.log('       "build": "pnpm -r build",')
    console.log('       "start": "pnpm -r start"')
  }
  console.log('')
}

import chalk from 'chalk'
import minimist from 'minimist'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prompts from 'prompts'
import {
  type Mode,
  type Pkg,
  backendFiles,
  webFiles,
} from './template-manifest.js'

const { blue, green, reset } = chalk
const { join } = path

export const kServerTemplates = ['express', 'fastify', 'koa'] as const
export type ServerTemplate = (typeof kServerTemplates)[number]

/**
 * This package's own `template/` directory. Resolved off `import.meta.url` the same way
 * `createCtx` resolves the project root below — the file sits directly in `src/` when run
 * through tsx and directly in `dist/` after `vp pack`, so `../..` is the package root in
 * both.
 */
export const templateRootDir = path.resolve(
  fileURLToPath(import.meta.url),
  '../../template',
)

// ---------------------------------------------------------------------------
// Copied from the retired full-kit scaffold, which is no longer part of this
// repository. Neither package ships an `exports` map, so these helpers cannot
// be imported from anywhere — they have to be duplicated here.
// ---------------------------------------------------------------------------

const copy = (src: string, dest: string) =>
  fs.statSync(src).isDirectory()
    ? copyDir(src, dest)
    : fs.copyFileSync(src, dest)

const copyDir = (srcDir: string, destDir: string) => {
  fs.mkdirSync(destDir, { recursive: true })
  const filenames = fs.readdirSync(srcDir)
  for (const file of filenames) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

const emptyDir = (dir: string) => {
  if (!fs.existsSync(dir)) return
  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') continue
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
  }
}

const mayOverwrite = async (dest: string) => {
  if (!fs.existsSync(dest)) return
  const confirm = await prompts([
    {
      type: 'confirm',
      name: 'overwrite',
      message: `Target directory "${dest}" is not empty. Remove existing files and continue?`,
    },
  ])
  if (!confirm.overwrite) {
    throw 'Canceled'
  }
  emptyDir(dest)
}

export const formatDestDir = (dest: string) => dest.trim().replace(/\/+$/g, '')

const pkgFromUserAgent = (userAgent = '') => {
  const pkgSpec = userAgent.split(' ')[0].split('/')[0]
  return pkgSpec.length < 1 ? 'npm' : pkgSpec
}

const logGuids = (guids: { title?: string; items: string[] }[]) => {
  const all = [
    '',
    green('     Scaffold project is ready.'),
    guids
      .flatMap(v => [
        v.title,
        v.items.map((s, i) => `  ${i + 1}. ${s}`).join('\n'),
      ])
      .filter(v => v != null)
      .join('\n'),
  ]
  console.log(all.join('\n'))
}

// ---------------------------------------------------------------------------
// End of the copied helpers. Everything below is this package's own.
// ---------------------------------------------------------------------------

export const isServerTemplate = (v: string): v is ServerTemplate =>
  (kServerTemplates as readonly string[]).includes(v)

const collectUserAnswer = async (
  argProjectName: string | undefined,
  presetServer: string | undefined,
  presetMode: Mode | undefined,
) => {
  if (presetServer != null && !isServerTemplate(presetServer)) {
    throw new Error(
      `Unknown --template "${presetServer}". Expected one of: ${kServerTemplates.join(', ')}`,
    )
  }
  // Only ask what the flags did not already answer, so `--template x <name>` is
  // fully non-interactive (that is what the e2e test relies on). The mode question rides
  // on the same rule rather than one of its own: a caller who named a template has asked
  // for a non-interactive run, and stopping to ask about JavaScript would break that
  // promise. They get TypeScript, and `--js` is how they say otherwise.
  const questions = [
    ...(argProjectName
      ? []
      : [
          {
            message: reset('Project name:'),
            name: 'projectName',
            type: 'text' as const,
            initial: 'tealina-app',
          },
        ]),
    ...(presetServer
      ? []
      : [
          {
            message: reset('Select a server template:'),
            name: 'server',
            type: 'select' as const,
            choices: [
              { title: 'Express', value: 'express' },
              { title: 'Fastify', value: 'fastify' },
              { title: 'Koa', value: 'koa' },
            ],
          },
        ]),
    // Skipped when *either* flag was given: `--template` alone already promises a
    // non-interactive run, and `--js`/`--ts` alone has answered this very question.
    ...(presetServer || presetMode
      ? []
      : [
          {
            message: reset('TypeScript or JavaScript?'),
            name: 'mode',
            type: 'select' as const,
            choices: [
              { title: 'TypeScript', value: 'ts' },
              {
                title: 'JavaScript — ESM, no build; types via .d.ts + JSDoc',
                value: 'js',
              },
            ],
          },
        ]),
  ]
  const answers = (await prompts(questions, {
    onCancel: () => {
      throw 'Canceled'
    },
  })) as { projectName?: string; server?: ServerTemplate; mode?: Mode }

  const rawName = answers.projectName ?? argProjectName
  if (rawName == null) throw 'Canceled'
  const server = answers.server ?? presetServer
  if (server == null || !isServerTemplate(server)) throw 'Canceled'
  return {
    projectName: formatDestDir(rawName),
    server,
    mode: answers.mode ?? presetMode ?? 'ts',
  }
}

/** npm package names are lowercase and free of leading dots/underscores. */
const toPkgName = (raw: string) => {
  const name = raw
    .toLowerCase()
    .replace(/[^a-z0-9-._~]+/g, '-')
    .replace(/^[-._~]+|[-._~]+$/g, '')
  return name.length > 0 ? name : 'tealina-project'
}

/**
 * The root scripts are written here rather than shipped in `template/root`: `create`
 * owns the whole `scripts` block, so a script that lived in the file would be lost.
 *
 * In TypeScript the two library packages are compiled once before the watchers start:
 * the server imports their `dist/`. In JavaScript there is nothing to build, so `build`
 * is the type checker — the same command the editor runs, over the same files.
 *
 * `pnpm -r` covers three backend packages, and covers `packages/web` as well when the
 * optional frontend is present. `check`/`fmt`/`lint` are Vite+'s Oxc toolchain; the root
 * `vite.config.ts` holds the settings they share.
 */
const rootScripts = (mode: Mode) => ({
  dev:
    mode === 'js'
      ? 'pnpm -r --parallel dev'
      : 'pnpm -F core build && pnpm -F api-v1 build && pnpm -r --parallel dev',
  build: 'pnpm -r build',
  start: 'pnpm -F server start',
  check: 'vp check',
  fmt: 'vp fmt',
  lint: 'vp lint',
})

const createRoot = (ctx: ContextType) => {
  fs.mkdirSync(ctx.dest, { recursive: true })
  copyDir(join(ctx.projectRootDir, 'template', 'root'), ctx.root)
  const pkgPath = join(ctx.root, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.name = toPkgName(path.basename(ctx.root))
  pkg.scripts = rootScripts(ctx.answer.mode)
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

/** The three packages that make up the backend, in dependency order. */
const kBackendPkgs: readonly Pkg[] = ['core', 'api-v1', 'server']

const createBackendProject = async (ctx: ContextType) => {
  for (const pkgName of kBackendPkgs) {
    await mayOverwrite(join(ctx.backend, pkgName))
  }
  for (const { src, dest, pkg } of backendFiles(
    ctx.answer.server,
    ctx.answer.mode,
  )) {
    const filePath = join(ctx.backend, pkg, dest)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.copyFileSync(join(templateRootDir, src), filePath)
  }
}

const createWebProject = async (ctx: ContextType) => {
  const destWebDir = join(ctx.dest, 'web')
  await mayOverwrite(destWebDir)
  for (const { src, dest } of webFiles(ctx.answer.mode)) {
    const filePath = join(destWebDir, dest)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.copyFileSync(join(templateRootDir, src), filePath)
  }
}

const hasCommand = (command: string) => {
  const res = spawnSync(command, ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
  return res.error == null && res.status === 0
}

/**
 * Runs a command in the scaffolded project and reports the outcome without ever
 * throwing — a failure here should leave the user with a usable project and a clear
 * next step, not a stack trace.
 */
const runStep = (command: string, args: string[], cwd: string) =>
  new Promise<boolean>(resolve => {
    console.log(`\n${blue('>')} ${[command, ...args].join(' ')}`)
    const child = spawn(command, args, { cwd, stdio: 'inherit' })
    const failed = (reason: string) => {
      console.log(`${chalk.yellow('!')} ${reason}`)
      resolve(false)
    }
    child.on('error', () => failed(`${command} could not be started`))
    child.on('close', code =>
      code === 0
        ? resolve(true)
        : failed(`${[command, ...args].join(' ')} exited with code ${code}`),
    )
  })

const installAndGenerate = async (ctx: ContextType) => {
  if (ctx.skipInstall) return false
  if (!hasCommand('pnpm')) {
    console.log(
      `\n${chalk.yellow('!')} pnpm was not found on your PATH, so dependencies were not installed.`,
    )
    return false
  }
  const installed = await runStep('pnpm', ['install'], ctx.root)
  if (!installed) return false
  // The version's document json is read from disk; without this the page has a source that
  // answers with an error.
  return runStep('pnpm', ['-F', 'api-v1', 'gdoc'], ctx.root)
}

const showGuide = (ctx: ContextType, ready: boolean) => {
  const { projectName, mode } = ctx.answer
  // Said out loud because `--template express <name>` settles the mode without asking,
  // and a scaffold that quietly picked one of two languages is worth one line.
  console.log(
    `\n${green(`Scaffolded a ${mode === 'js' ? 'JavaScript' : 'TypeScript'} project.`)}`,
  )
  logGuids([
    {
      title: blue('Done. Now run:'),
      items: [
        `cd ${projectName}`,
        ...(ready ? [] : ['pnpm install', 'pnpm -F api-v1 gdoc']),
        'pnpm dev',
      ],
    },
    ...(ctx.web
      ? [
          {
            title: blue('The frontend is the Vite dev server:'),
            items: [
              'http://localhost:5173',
              'it proxies the api to http://localhost:8000 — retarget that in ' +
                'packages/web/vite.config.ts if `PORT` is not 8000',
            ],
          },
        ]
      : []),
  ])
  // One line, said once, because the alternative to `--web` is a reader concluding there
  // is no frontend story at all rather than that this one is opt-in.
  if (!ctx.web) {
    console.log(
      `\n${blue('--web')} adds a minimal frontend that reads the API types rather than restating them.`,
    )
  }
}

type ContextType = Awaited<ReturnType<typeof createCtx>>

const createCtx = async () => {
  const argv = minimist<{
    template?: string
    install?: boolean
    'no-install'?: boolean
    js?: boolean
    ts?: boolean
    web?: boolean
  }>(process.argv.slice(2), {
    string: ['_', 'template'],
    boolean: ['no-install', 'js', 'ts', 'web'],
  })
  // Two flags rather than one `--mode <value>`: this is a binary choice, and `--js` is
  // the thing someone types. `--ts` exists so a script can say "not JavaScript"
  // regardless of what the interactive default is.
  if (argv.js && argv.ts) {
    throw new Error('--js and --ts contradict each other; pass one.')
  }
  const answer = await collectUserAnswer(
    argv._[0],
    argv.template,
    argv.js ? 'js' : argv.ts ? 'ts' : undefined,
  )
  const root = path.resolve(process.cwd(), answer.projectName)
  const projectRootDir = path.resolve(fileURLToPath(import.meta.url), '../../')
  return {
    answer,
    root,
    // The backend is three packages; the optional frontend is the only thing in
    // `packages/`.
    backend: join(root, 'backend'),
    dest: join(root, 'packages'),
    projectRootDir,
    pkgManager: pkgFromUserAgent(process.env.npm_config_user_agent),
    // minimist rewrites `--no-install` into `install: false`, so read both spellings.
    skipInstall: argv.install === false || argv['no-install'] === true,
    // A flag beside `skipInstall` rather than an answer beside `server`: nothing asks
    // this question. `--web` is the only way to say it.
    web: argv.web === true,
  }
}

export const createScaffold = async () => {
  const ctx = await createCtx()
  createRoot(ctx)
  await createBackendProject(ctx)
  if (ctx.web) await createWebProject(ctx)
  const ready = await installAndGenerate(ctx)
  showGuide(ctx, ready)
}

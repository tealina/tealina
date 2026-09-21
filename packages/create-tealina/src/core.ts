import chalk from 'chalk'
import minimist from 'minimist'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prompts from 'prompts'
import versionMap from '../template/versionMaps.json'
import { type Mode, createFiles, webFiles } from './template-manifest.js'

const { blue, green, reset } = chalk
const { join } = path

export const kServerTemplates = ['express', 'fastify', 'koa'] as const
export type ServerTemplate = (typeof kServerTemplates)[number]

/**
 * This package's own `template/` directory. Resolved off `import.meta.url` the same way
 * `createCtx` resolves the project root below — the file sits directly in `src/` when run
 * through tsx and directly in `dist/` after `unbuild`, so `../..` is the package root in
 * both. `init` reads from here too, which is why it is a module-level constant now.
 */
export const templateRootDir = path.resolve(
  fileURLToPath(import.meta.url),
  '../../template',
)

// ---------------------------------------------------------------------------
// Copied from the retired full-kit scaffold, now in archive/create-tealina.
// Neither ships an `exports` map, so nothing there can be imported — these
// have to be duplicated. The archive is a frozen snapshot, not maintained:
// fix bugs here, not there.
//
// `mayCopyCommonDir` was the one helper deliberately not carried over:
// `create` copies from template-manifest.ts now, which names the files
// instead of walking a directory, so a wholesale `common/` copy no longer
// exists on this side. The archived package still walks directories and
// keeps its own copy.
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

const createRoot = (ctx: ContextType) => {
  fs.mkdirSync(ctx.dest, { recursive: true })
  copyDir(join(ctx.projectRootDir, 'template', 'root'), ctx.root)
  const pkgPath = join(ctx.root, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.name = toPkgName(path.basename(ctx.root))
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
}

const updateServerPackageJson = (serverDestDir: string) => {
  const pkgPath = join(serverDestDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  // The name is what the frontend links against via `workspace:*`, and what
  // `pnpm -F <name>` in the root scripts refers to.
  pkg.name = path.basename(serverDestDir)
  const { server } = versionMap
  Object.assign(pkg.dependencies, server.dependencies)
  Object.assign(pkg.devDependencies, server.devDependencies)
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
}

const createServerProject = async (ctx: ContextType) => {
  const destServerDir = join(ctx.dest, 'server')
  await mayOverwrite(destServerDir)
  for (const { src, dest } of createFiles(ctx.answer.server, ctx.answer.mode)) {
    const filePath = join(destServerDir, dest)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.copyFileSync(join(templateRootDir, src), filePath)
  }
  updateServerPackageJson(destServerDir)
}

const updateWebPackageJson = (webDestDir: string) => {
  const pkgPath = join(webDestDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.name = path.basename(webDestDir)
  // `server: workspace:*` is left as the template wrote it. `create` names that package
  // `server` and nothing else, so there is no name to substitute here the way `init` has
  // to — the placeholder and the real thing are the same string.
  const { web } = versionMap
  Object.assign(pkg.dependencies, web.dependencies)
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
}

/**
 * The root scripts are `pnpm -F server …` because the server is the only workspace there
 * is. A frontend beside it is the one case where they have to cover both — and the only
 * file this feature rewrites rather than writes.
 */
const spreadRootScripts = (ctx: ContextType) => {
  const pkgPath = join(ctx.root, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.scripts.dev = 'pnpm -r --parallel dev'
  pkg.scripts.build = 'pnpm -r build'
  // `web` has no `start` — it is served by Vite in development and by whatever you deploy
  // `dist/` to in production. A recursive run skips the packages that lack the script.
  pkg.scripts.start = 'pnpm -r start'
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
}

const createWebProject = async (ctx: ContextType) => {
  const destWebDir = join(ctx.dest, 'web')
  await mayOverwrite(destWebDir)
  for (const { src, dest } of webFiles(ctx.answer.mode)) {
    const filePath = join(destWebDir, dest)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.copyFileSync(join(templateRootDir, src), filePath)
  }
  updateWebPackageJson(destWebDir)
  spreadRootScripts(ctx)
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
  // The API docs route reads docs/api-v1.json from disk; without this the doc page 500s.
  return runStep('pnpm', ['-F', 'server', 'gdoc'], ctx.root)
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
        ...(ready ? [] : ['pnpm install', 'pnpm -F server gdoc']),
        'pnpm dev',
      ],
    },
    ...(ctx.web
      ? [
          {
            title: blue('The frontend is the Vite dev server:'),
            items: ['http://localhost:5173'],
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
    dest: join(root, 'packages'),
    projectRootDir,
    pkgManager: pkgFromUserAgent(process.env.npm_config_user_agent),
    // minimist rewrites `--no-install` into `install: false`, so read both spellings.
    skipInstall: argv.install === false || argv['no-install'] === true,
    // A flag beside `skipInstall` rather than an answer beside `server`: nothing asks
    // this question. `--web` is the only way to say it, and the answers stay what they
    // were — which is what keeps the default output byte-for-byte what it is today.
    web: argv.web === true,
  }
}

export const createScaffold = async () => {
  const ctx = await createCtx()
  createRoot(ctx)
  await createServerProject(ctx)
  if (ctx.web) await createWebProject(ctx)
  const ready = await installAndGenerate(ctx)
  showGuide(ctx, ready)
}

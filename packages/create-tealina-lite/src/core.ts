import chalk from 'chalk'
import minimist from 'minimist'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prompts from 'prompts'
import versionMap from '../template/versionMaps.json'

const { blue, green, reset } = chalk
const { join } = path

const kServerTemplates = ['express', 'fastify', 'koa'] as const
type ServerTemplate = (typeof kServerTemplates)[number]

// ---------------------------------------------------------------------------
// Copied from packages/create-tealina/src/core.ts. That package ships no `exports`
// map, so nothing in it can be imported — these have to be duplicated. If you fix a
// bug in one of them, fix it in both.
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

const mayCopyCommonDir = (templateDir: string, destDir: string) => {
  const commonDir = join(templateDir, 'common')
  if (fs.existsSync(commonDir)) {
    copyDir(commonDir, destDir)
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

const formatDestDir = (dest: string) => dest.trim().replace(/\/+$/g, '')

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
// Above is shared with create-tealina; below is lite-specific.
// ---------------------------------------------------------------------------

const isServerTemplate = (v: string): v is ServerTemplate =>
  (kServerTemplates as readonly string[]).includes(v)

const collectUserAnswer = async (
  argProjectName: string | undefined,
  presetServer: string | undefined,
) => {
  if (presetServer != null && !isServerTemplate(presetServer)) {
    throw new Error(
      `Unknown --template "${presetServer}". Expected one of: ${kServerTemplates.join(', ')}`,
    )
  }
  // Only ask what the flags did not already answer, so `--template x <name>` is
  // fully non-interactive (that is what the e2e test relies on).
  const questions = [
    ...(argProjectName
      ? []
      : [
          {
            message: reset('Project name:'),
            name: 'projectName',
            type: 'text' as const,
            initial: 'tealina-lite-app',
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
  ]
  const answers = (await prompts(questions, {
    onCancel: () => {
      throw 'Canceled'
    },
  })) as { projectName?: string; server?: ServerTemplate }

  const rawName = answers.projectName ?? argProjectName
  if (rawName == null) throw 'Canceled'
  const server = answers.server ?? presetServer
  if (server == null || !isServerTemplate(server)) throw 'Canceled'
  return { projectName: formatDestDir(rawName), server }
}

/** npm package names are lowercase and free of leading dots/underscores. */
const toPkgName = (raw: string) => {
  const name = raw
    .toLowerCase()
    .replace(/[^a-z0-9-._~]+/g, '-')
    .replace(/^[-._~]+|[-._~]+$/g, '')
  return name.length > 0 ? name : 'tealina-lite-project'
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
  const templateDir = join(ctx.projectRootDir, 'template')
  mayCopyCommonDir(templateDir, destServerDir)
  copyDir(join(templateDir, 'server', ctx.answer.server), destServerDir)
  updateServerPackageJson(destServerDir)
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
  const { projectName } = ctx.answer
  logGuids([
    {
      title: blue('Done. Now run:'),
      items: [
        `cd ${projectName}`,
        ...(ready ? [] : ['pnpm install', 'pnpm -F server gdoc']),
        'pnpm dev',
      ],
    },
  ])
}

type ContextType = Awaited<ReturnType<typeof createCtx>>

const createCtx = async () => {
  const argv = minimist<{
    template?: string
    install?: boolean
    'no-install'?: boolean
  }>(process.argv.slice(2), {
    string: ['_', 'template'],
    boolean: ['no-install'],
  })
  const answer = await collectUserAnswer(argv._[0], argv.template)
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
  }
}

export const createScaffold = async () => {
  const ctx = await createCtx()
  createRoot(ctx)
  await createServerProject(ctx)
  const ready = await installAndGenerate(ctx)
  showGuide(ctx, ready)
}

import chalk from 'chalk'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import minimist from 'minimist'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ora from 'ora'
import prompts from 'prompts'
import { createTemplates } from './template-factory/create'
import { writeTemplates } from './template-factory/write'

const { blue, green, reset } = chalk
const { join } = path
const kInitDemo = 'init-demo.mjs'
const kInitCommand = 'init-demo'

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

const GIT_IGNORE_CONTNET = [
  'node_modules',
  '# Keep environment variables out of version control',
  '.env',
].join('\n')

const createProject = (
  templateDir: string,
  dest: string,
  beforeWritePkg?: (pkg: Record<string, any>) => Record<string, any>,
) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  let pkg = JSON.parse(
    fs.readFileSync(join(templateDir, 'package.json'), 'utf-8'),
  )
  pkg.name = path.basename(dest)
  if (beforeWritePkg) {
    pkg = beforeWritePkg(pkg)
  }
  fs.writeFileSync(join(dest, 'package.json'), JSON.stringify(pkg, null, 2))
  fs.writeFileSync(join(dest, '.gitignore'), GIT_IGNORE_CONTNET)
}

const setupLines = [
  'import { execSync } from "node:child_process"',
  "import { fileURLToPath } from 'node:url'",
  "import { dirname } from 'node:path'",
  'const __filename = fileURLToPath(import.meta.url)',
  'const __dirname = dirname(__filename)',
  '',
  'const $ = (strs) => {',
  "  const command = strs.join(' ')",
  "  execSync(command,{ stdio: 'inherit', encoding: 'utf-8', cwd: __dirname })",
  '}',
  '',
]

const writeInitDevFile = (
  pkgManager: ContextType['pkgManager'],
  destServerDir: string,
) => {
  const command = (...args: string[]) =>
    ['$`', getRunLeader(pkgManager), ...args, '`'].join('')
  const initCommands = [
    ...setupLines,
    command(' install'),
    command(' prisma db push'),
    command(' v1 gtype'),
    command(' v1 get/status'),
    command(' v1 gdoc'),
  ]
  fs.writeFileSync(join(destServerDir, kInitDemo), initCommands.join('\n'))
}

const copyTemplates = (dest: string, webExtraTemplateDir: string) => {
  const write = (file: string) => {
    const targetPath = join(dest, file)
    copy(join(webExtraTemplateDir, file), targetPath)
  }
  const files = fs.readdirSync(webExtraTemplateDir)
  for (const file of files) {
    write(file)
  }
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

const showGuide = ({ answer, pkgManager }: ContextType) => {
  const { projectName } = answer
  const leader = getRunLeader(pkgManager)
  return logGuids([
    {
      title: blue('Done. Now run:'),
      items: [
        `cd ${projectName}`,
        `${leader} ${kInitCommand}`,
        `${leader} dev`,
      ],
    },
  ])
}

const mayCopyCommonDir = (templateDir: string, destDir: string) => {
  const commonDir = join(templateDir, 'common')
  if (fs.existsSync(commonDir)) {
    copyDir(commonDir, destDir)
  }
}

const formatDestDir = (dest: string) => dest.trim().replace(/\/+$/g, '')

const collectUserAnswer = (argProjectName: string | undefined) =>
  prompts(
    [
      {
        message: reset('Project name:'),
        name: 'projectName',
        type: argProjectName ? null : 'text',
        initial: argProjectName ?? 'tealina-project',
      },
      {
        message: reset('Select a server template:'),
        name: 'server',
        type: 'select',
        choices: [
          { title: 'Express', value: 'express' },
          { title: 'Fastify', value: 'fastify' },
          { title: 'Koa', value: 'koa' },
        ],
      },
      {
        message: reset('Select an API style:'),
        name: 'apiStyle',
        type: 'select',
        choices: [
          { title: 'RESTful', value: 'restful' },
          { title: 'POST + GET', value: 'post-get' },
        ],
      },
      {
        message: reset('Select a web template:'),
        name: 'web',
        type: 'select',
        choices: [
          { title: 'React', value: 'react-ts' },
          { title: 'React + SWC', value: 'react-swc-ts' },
          { title: 'Vue', value: 'vue-ts' },
          { title: 'Svelte', value: 'svelte-ts' },
          { title: 'Lit', value: 'lit-ts' },
          { title: 'Preact', value: 'preact-ts' },
          { title: 'Vanilla', value: 'vanilla-ts' },
          { title: 'None', value: 'none' },
        ],
        hint: 'Templates from create-vite',
      },
    ],
    {
      onCancel: () => {
        throw 'Canceled'
      },
    },
  ).then(v => ({
    ...v,
    projectName: formatDestDir(v.projectName ?? argProjectName),
  }))

type ContextType = Awaited<ReturnType<typeof createCtx>>

const getRunLeader = (pkgManager: string) => {
  switch (pkgManager) {
    case 'bun':
      return 'bun run'
    case 'deno':
      return 'deno task'
    default:
      return 'pnpm'
  }
}

const pkgFromUserAgent = (userAgent = '') => {
  const pkgSpec = userAgent.split(' ')[0].split('/')[0]
  return pkgSpec.length < 1 ? 'npm' : pkgSpec
}

const createServerProject = async (ctx: ContextType) => {
  const { projectRootDir, answer } = ctx
  const { server } = answer
  const destServerDir = join(ctx.dest, 'server')
  await mayOverwrite(destServerDir)
  const templateDir = join(projectRootDir, 'template')
  const templateServerDir = join(templateDir, 'server', server)
  mayCopyCommonDir(templateDir, destServerDir)
  copyDir(templateServerDir, destServerDir)
  const isRestful = answer.apiStyle === 'restful'
  const templateSnaps = createTemplates({
    isRestful,
    framwork: answer.server,
  })
  writeTemplates(
    path.join(destServerDir, 'dev-templates/handlers'),
    templateSnaps,
  )
  createProject(templateServerDir, destServerDir, pkg => {
    const runtime = getRuntime(ctx)
    pkg.scripts['init-demo'] = `${runtime} ${kInitDemo}`
    return pkg
  })
  if (isRestful) {
    copyDir(join(templateDir, 'restful-only'), destServerDir)
  } else {
    copyDir(join(templateDir, 'post-get'), destServerDir)
  }
  writeInitDevFile(ctx.pkgManager, destServerDir)
}

const runCreateVite = async (ctx: ContextType, webDest: string) =>
  new Promise<void>(res => {
    const { answer, pkgManager } = ctx
    const name = path.basename(webDest)
    const leader = pkgManager === 'npm' ? 'npx' : pkgManager
    const fullArgs = ['create', 'vite', name, '--template', answer.web]
    const spinner = ora({ spinner: 'dots' })
    spinner.start(['Running', leader, ...fullArgs].join(' '))
    const p = spawn(leader, fullArgs, { cwd: path.dirname(webDest) })
    // p.stdout.setEncoding('utf-8')
    // p.stdout.on('data', v => {
    //   console.log('--->', String(v))
    // })
    p.stderr.setEncoding('utf-8')
    const errMessages: string[] = []
    p.stderr.on('data', v => {
      errMessages.push(String(v))
    })
    const skipCreateWeb = (err: unknown) => {
      spinner.fail('Run create vite failed, skip current step')
      console.error('Error detail: \n', err)
      spinner.stop()
      res()
    }
    p.on('exit', code => {
      if (code == null || code === 0) return
      skipCreateWeb(errMessages.join('\n'))
    })
    p.on('error', skipCreateWeb)
    p.on('close', () => {
      spinner.stop()
      res()
    })
  })

const updatePackageJson = (webDestDir: string) => {
  const pkg = JSON.parse(
    fs.readFileSync(join(webDestDir, 'package.json'), 'utf-8'),
  )
  pkg.dependencies['@tealina/client'] = '^1.0.0'
  pkg.dependencies.axios = '^1.7.7'
  pkg.devDependencies.server = 'workspace:*'
  pkg.devDependencies['@shared/type'] = 'workspace:*'
  fs.writeFileSync(
    join(webDestDir, 'package.json'),
    JSON.stringify(pkg, null, 2),
  )
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

const updateViteConfig = (webDest: string) => {
  const proxyConfig = [
    'server: {',
    '  proxy: {',
    "    '/api': 'http://localhost:5000'",
    '  }',
    '},',
  ].map(v => `  ${v}`)
  const viteConfigPath = path.join(webDest, 'vite.config.ts')
  const content = fs.readFileSync(viteConfigPath).toString().trimEnd()
  const newContent = content
    .split('\n')
    .slice(0, -1)
    .concat(proxyConfig)
    .concat(['})', ''])
    .join('\n')
  fs.writeFileSync(viteConfigPath, newContent)
}

const createWebProject = async (ctx: ContextType) => {
  const { projectRootDir, dest } = ctx
  const webDest = join(dest, 'web')
  await mayOverwrite(webDest)
  await runCreateVite(ctx, webDest)
  updatePackageJson(webDest)
  updateViteConfig(webDest)
  const webExtraTemplateDir = join(projectRootDir, 'template', 'web')
  copyTemplates(webDest, webExtraTemplateDir)
}

const createCtx = async () => {
  const argv = minimist<{
    d?: boolean
  }>(process.argv.slice(2), { string: ['_'], boolean: ['d'] })
  const answer = await collectUserAnswer(argv._[0])
  const cwd = process.cwd()
  const root = path.resolve(cwd, answer.projectName)
  const projectRootDir = path.resolve(fileURLToPath(import.meta.url), '../../')
  const pkgManager = pkgFromUserAgent(process.env.npm_config_user_agent)
  return {
    answer,
    root,
    dest: path.join(root, 'packages'),
    projectRootDir,
    pkgManager,
  }
}
const getRuntime = (ctx: ContextType) => {
  switch (ctx.pkgManager) {
    case 'bun':
    // case 'deno':
    //   return ctx.pkgManager
    default:
      return 'node'
  }
}
const createRoot = (ctx: ContextType) => {
  const pkgDest = path.join(ctx.root, 'packages')
  fs.mkdirSync(pkgDest, { recursive: true })
  const webExtraTemplateDir = join(
    ctx.projectRootDir,
    'template',
    'root',
    getRuntime(ctx),
  )
  copyTemplates(ctx.root, webExtraTemplateDir)
  copyDir(join(ctx.projectRootDir, 'template', 'pkg'), pkgDest)
}

export const createScaffold = async () => {
  const ctx = await createCtx()
  createRoot(ctx)
  await createServerProject(ctx)
  if (ctx.answer.web !== 'none') {
    await createWebProject(ctx)
  }
  showGuide(ctx)
}

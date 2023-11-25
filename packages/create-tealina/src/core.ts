import chalk from 'chalk'
import { spawn } from 'child_process'
import fs, { existsSync, writeFileSync } from 'fs'
import minimist from 'minimist'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prompts from 'prompts'
import { createTemplates } from './template-factory/create'
import { writeTemplates } from './template-factory/write'

const { blue, green, reset } = chalk
const { join } = path

const copy = (src: string, dest: string) =>
  fs.statSync(src).isDirectory()
    ? copyDir(src, dest)
    : fs.copyFileSync(src, dest)

const copyDir = (srcDir: string, destDir: string) => {
  fs.mkdirSync(destDir, { recursive: true })
  fs.readdirSync(srcDir).forEach(file => {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  })
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
  'import { execSync } from "child_process"',
  '',
  'const $ = (strs) => {',
  "  const command = strs.join(' ')",
  "  execSync(command,{ stdio: 'inherit', encoding:'utf-8' })",
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
    command(' v1 gpure'),
    command(' v1 capi get/status --with-test'),
    command(' v1 gdoc'),
  ]
  writeFileSync(join(destServerDir, 'init-dev.mjs'), initCommands.join('\n'))
}

const injectExtraTemplates = (dest: string, webExtraTemplateDir: string) => {
  const write = (file: string) => {
    const targetPath = join(dest, file)
    copy(join(webExtraTemplateDir, file), targetPath)
  }
  fs.readdirSync(webExtraTemplateDir).forEach(file => write(file))
}

const showBothGuid = (serverGuid: string[], webGuid: string[]) => {
  const all = [
    '',
    green('     Fullstack project is ready'),
    blue('Server:'),
    serverGuid.map((v, i) => `  ${i + 1}. ${v}`).join('\n'),
    blue('Web:'),
    webGuid.map((v, i) => `  ${i + 1}. ${v}`).join('\n'),
  ]
  console.log(all.join('\n'))
}

const showGuide = ({ answer, pkgManager }: ContextType) => {
  const { projectName } = answer
  const leader = getRunLeader(pkgManager)
  const webGuid = [
    `cd ${projectName}/web`,
    `${leader} install`,
    `${leader} dev`,
  ]
  const runtime = leader == 'bun' ? 'bun' : 'node'
  const serverGuid = [
    `cd ${projectName}/server`,
    `${runtime} init-dev.mjs`,
    `${leader} dev`,
  ]
  showBothGuid(serverGuid, webGuid)
}

const mayCopyCommonDir = (templateDir: string, destDir: string) => {
  const commonDir = join(templateDir, 'common')
  if (existsSync(commonDir)) {
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

const getRunLeader = (pkgManager: string) =>
  pkgManager == 'npm' ? 'npm run' : pkgManager

const pkgFromUserAgent = (userAgent: string = '') => {
  const pkgSpec = userAgent.split(' ')[0].split('/')[0]
  return pkgSpec.length < 1 ? 'npm' : pkgSpec
}

const createServerProject = async (ctx: ContextType) => {
  const { projectRootDir, answer } = ctx
  const { server, apiStyle } = answer
  const destServerDir = join(ctx.dest, 'server')
  await mayOverwrite(destServerDir)
  const templateDir = join(projectRootDir, 'template')
  const templateServerDir = join(templateDir, 'server', server)
  mayCopyCommonDir(templateDir, destServerDir)
  mayCopyCommonDir(templateServerDir, destServerDir)
  const templateSnaps = createTemplates({
    isRestful: answer.apiStyle == 'restful',
    framwork: answer.server,
  })
  writeTemplates(
    path.join(destServerDir, 'dev-templates/handlers'),
    templateSnaps,
  )
  createProject(join(templateServerDir, 'common'), destServerDir)
  const apiStyleDir = join(templateServerDir, apiStyle)
  copyDir(apiStyleDir, destServerDir)
  mayCopyCommonDir(apiStyleDir, destServerDir)
  if (apiStyle == 'restful') {
    copyDir(join(templateDir, 'restful-only'), destServerDir)
  }
  writeInitDevFile(ctx.pkgManager, destServerDir)
}

const runCreateVite = async (ctx: ContextType, webDest: string) =>
  new Promise<void>(res => {
    const { answer, pkgManager } = ctx
    const name = path.basename(webDest)
    const dir = path.dirname(webDest)
    const leader = pkgManager == 'npm' ? 'npx' : pkgManager
    const fullArgs = ['create', 'vite', name, '-t', answer.web]
    console.log('  Running', leader, ...fullArgs)
    const p = spawn(leader, fullArgs, { cwd: dir })
    p.on('error', err => {
      console.log('Run create vite failed, skip current step')
      console.error('errr', err)
      res()
    })
    p.on('close', code => {
      if (code != 0) return
      res()
    })
  })

const updatePackageJson = (webDestDir: string) => {
  let pkg = JSON.parse(
    fs.readFileSync(join(webDestDir, 'package.json'), 'utf-8'),
  )
  pkg.dependencies.axios = '^1.4.1'
  pkg.devDependencies['server'] = 'link:../server'
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
  if (!existsSync(dest)) return
  const confirm = await prompts([
    {
      type: 'confirm',
      name: 'overwrite',
      message:
        `Target directory "${dest}"` +
        ` is not empty. Remove existing files and continue?`,
    },
  ])
  if (!confirm.overwrite) {
    throw 'Canceled'
  }
  emptyDir(dest)
}

const createWebProject = async (ctx: ContextType) => {
  const { projectRootDir, answer, dest } = ctx
  const webDestDir = join(dest, 'web')
  if (answer.web != 'none') {
    const webDest = path
      .join(answer.projectName, 'web')
      .split(path.sep)
      .join('/')
    await mayOverwrite(webDest)
    await runCreateVite(ctx, webDest)
    updatePackageJson(webDestDir)
  }
  const webExtraTemplateDir = join(projectRootDir, 'template', 'web')
  injectExtraTemplates(webDestDir, webExtraTemplateDir)
}

const createCtx = async () => {
  const argv = minimist<{
    d?: boolean
  }>(process.argv.slice(2), { string: ['_'], boolean: ['d'] })
  const answer = await collectUserAnswer(argv._[0])
  const cwd = process.cwd()
  const dest = path.resolve(cwd, answer.projectName)
  const projectRootDir = path.resolve(fileURLToPath(import.meta.url), '../../')
  const pkgManager = pkgFromUserAgent(process.env.npm_config_user_agent)
  const isDemo = answer.server == 'demo'
  return {
    answer,
    dest,
    projectRootDir,
    isDemo,
    pkgManager,
  }
}

export const createScaffold = async () => {
  const ctx = await createCtx()
  await createServerProject(ctx)
  await createWebProject(ctx)
  showGuide(ctx)
}

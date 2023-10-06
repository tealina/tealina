import chalk from 'chalk'
import fs, { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prompts from 'prompts'

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
    command(' install .'),
    command(' prisma db push'),
    command(' v1 gpure'),
    command(' v1 capi get/health --with-test'),
    command(' v1 gdoc'),
  ]
  writeFileSync(join(destServerDir, 'init-dev.mjs'), initCommands.join('\n'))
}

const writeBasicInitDevFile = (
  pkgManager: ContextType['pkgManager'],
  destServerDir: string,
) => {
  const command = (...args: string[]) =>
    ['$`', getRunLeader(pkgManager), ...args, '`'].join('')
  const initCommands = [
    ...setupLines,
    command(' install .'),
    command(' v1 capi get/health --with-test'),
    command(' v1 gdoc'),
  ]
  writeFileSync(join(destServerDir, 'init-dev.mjs'), initCommands.join('\n'))
}

const injectExtraTemplates = (
  webDestDir: string,
  webExtraTemplateDir: string,
) => {
  const dest = join(webDestDir, 'src')
  const write = (file: string) => {
    const targetPath = join(dest, file)
    copy(join(webExtraTemplateDir, file), targetPath)
  }
  fs.readdirSync(webExtraTemplateDir).forEach(file => write(file))
}

const showBothGuid = (serverGuid: string[], webGuid: string[]) => {
  const all = [
    '',
    green('     Full stack project is ready'),
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
    `${leader} install .`,
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

const collectUserAnswer = () =>
  prompts(
    [
      {
        message: reset('Project name:'),
        name: 'projectName',
        type: 'text',
      },
      {
        message: reset('Select a server template:'),
        name: 'server',
        type: 'select',
        choices: [
          { title: 'Demo (Express + SQLite)', value: 'demo' },
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
  )

type ContextType = Awaited<ReturnType<typeof createCtx>>

const getRunLeader = (pkgManager: string) =>
  pkgManager == 'npm' ? 'npm run' : pkgManager

const pkgFromUserAgent = (userAgent: string = '') => {
  const pkgSpec = userAgent.split(' ')[0].split('/')[0]
  return pkgSpec.length < 1 ? 'npm' : pkgSpec
}

const createServerProject = (ctx: ContextType) => {
  const { projectRootDir, answer, isDemo } = ctx
  const { server, apiStyle } = answer
  const templateDir = join(projectRootDir, 'template')
  const templateServerDir = join(templateDir, 'server', server)
  const destServerDir = join(ctx.dest, 'server')
  mayCopyCommonDir(templateDir, destServerDir)
  mayCopyCommonDir(templateServerDir, destServerDir)
  createProject(join(templateServerDir, 'common'), destServerDir)
  const apiStyleDir = join(templateServerDir, apiStyle)
  copyDir(apiStyleDir, destServerDir)
  mayCopyCommonDir(apiStyleDir, destServerDir)
  if (apiStyle == 'restful') {
    copyDir(join(templateDir, 'restful-only'), destServerDir)
  }
  if (isDemo) {
    const dbTemplateDir = join(templateDir, 'db-sqlite/prisma')
    copyDir(dbTemplateDir, join(destServerDir, 'prisma'))
    writeInitDevFile(ctx.pkgManager, destServerDir)
    return
  }
  writeBasicInitDevFile(ctx.pkgManager, destServerDir)
}

const createWebProject = (ctx: ContextType) => {
  const { projectRootDir, answer, dest } = ctx
  const webDestDir = join(dest, 'web')
  const viteWebTemplateDir = join(
    projectRootDir,
    `node_modules/create-vite/template-${answer.web}`,
  )
  if (answer.web != 'none' && existsSync(viteWebTemplateDir)) {
    copyDir(viteWebTemplateDir, webDestDir)
    createProject(viteWebTemplateDir, webDestDir, pkg => {
      pkg.dependencies.axios = '^1.4.1'
      pkg.dependencies['fp-lite'] = '^1.1.0'
      pkg.devDependencies['server'] = 'link:../server'
      return pkg
    })
  }
  const webExtraTemplateDir = join(projectRootDir, 'template', 'web')
  injectExtraTemplates(webDestDir, webExtraTemplateDir)
}

const createCtx = async () => {
  const [, , ...options] = process.argv
  const answer = await collectUserAnswer()
  const cwd = process.cwd()
  const dest = path.resolve(cwd, answer.projectName.trim())
  const projectRootDir = path.resolve(fileURLToPath(import.meta.url), '../../')
  const pkgManager = pkgFromUserAgent(process.env.npm_config_user_agent)
  const isDemo = answer.server == 'demo'
  return {
    answer: isDemo ? { ...answer, server: 'express' } : answer,
    dest,
    projectRootDir,
    isDemo: isDemo || options.includes('-d'), //for test
    pkgManager,
  }
}

export const createScaffold = async () => {
  const ctx = await createCtx()
  createWebProject(ctx)
  createServerProject(ctx)
  showGuide(ctx)
}

import { cac } from 'cac'
import { existsSync, readFileSync } from 'node:fs'
import {
  kDefaultConfigPath,
  loadConfigFromPath,
  mergeInlineOptions,
  resolveConfigPath,
} from '../utils/tool'
import { createApis } from './capi'
import { deleteApis } from './dapi'
import { pickOption4gdoc, startGenerateDoc } from './gdoc'
import { generatePureTypes, pickOption4gtype } from './gtype'
import { pickOption4align, syncApiByFile } from './sapi'

export interface RawOptions {
  route?: string
  model: boolean
  output?: string
  input?: string
  templateAlias?: string
  withTest: boolean
  tsconfigPath: string
  configPath: string
  namespace: string
  /** Compare generated output with disk and exit non-zero on drift; never writes. */
  check: boolean
  /** Machine-readable output: one JSON object on stdout, errors on stderr. */
  json: boolean
}

const kDefaultGtypeInput = './prisma/schema.prisma'

/** The config is the single source of the api directory, so every command loads it. */
const loadOptions = async (options: RawOptions) => {
  const basicConfig = await loadConfigFromPath(
    resolveConfigPath(options.configPath),
  )
  return mergeInlineOptions(basicConfig, options)
}

const runCreate = async (route: string | undefined, options: RawOptions) => {
  if (!options.model && route == null) {
    throw new Error(
      'tealina create needs a route, for example `tealina create post/order`.',
    )
  }
  const config = await loadOptions({ ...options, route })
  return createApis(config)
}

const runDelete = async (route: string, options: RawOptions) =>
  deleteApis(await loadOptions({ ...options, route }))

const runAlign = async (options: RawOptions) =>
  syncApiByFile(pickOption4align(await loadOptions(options)))

const runGdoc = async (options: RawOptions) =>
  startGenerateDoc(pickOption4gdoc(await loadOptions(options)))

const runGtype = async (options: RawOptions) => {
  const config = await loadOptions(options)
  if (config.input == null) {
    const prismaConfigPath = './prisma.config.ts'
    let final = kDefaultGtypeInput
    if (existsSync(prismaConfigPath)) {
      const configFromFile = await loadConfigFromPath(prismaConfigPath)
      final = configFromFile.schema ?? kDefaultGtypeInput
    }
    config.input = final
  }
  return generatePureTypes(pickOption4gtype(config))
}

const cli = cac('tealina')

cli.option('--config-path <path>', 'Tealina config path', {
  default: kDefaultConfigPath,
})
cli.option('--verbose', 'Show execution stack when error')

cli
  .command('create [route]', 'Create APIs')
  .option('-m,--model', 'Batch create APIs by model name in the .prisma file.')
  .option(
    '-i,--input <path>',
    'Prisma schema path, default:  ./prisma/schema.prisma',
  )
  .option('-t,--template-alias <alias>', 'Template alias')
  .option('--with-test', 'Create the integration test file too')
  .option('--tp,--tsconfig-path <path>', 'TypeScript config path', {
    default: './tsconfig.json',
  })
  // `cac` passes positionals first and the options object last.
  .action((...args) => {
    const options = args.pop() as RawOptions
    return runCreate(args[0] as string | undefined, options)
  })

cli
  .command('delete <route>', 'Delete APIs')
  .option('--with-test', 'Delete the integration test file too')
  .option('--tp,--tsconfig-path <path>', 'TypeScript config path', {
    default: './tsconfig.json',
  })
  .action((...args) => {
    const options = args.pop() as RawOptions
    return runDelete(args[0] as string, options)
  })

cli
  .command('align', 'Align APIs, rebuilding the route barrels')
  .option(
    '--check',
    'Compare generated output with disk, write nothing, exit 1 on drift',
  )
  .option('--json', 'Machine-readable output (one JSON object on stdout)')
  .action((options: RawOptions) => runAlign(options))

cli
  .command('gdoc', 'Generate the API document (json format)')
  .option('-o,--output <string>', 'Output directory')
  .option(
    '--check',
    'Compare the document with disk, write nothing, exit 1 on drift',
  )
  .option('--json', 'Machine-readable output (one JSON object on stdout)')
  .option('--tp,--tsconfig-path <path>', 'TypeScript config path', {
    default: './tsconfig.json',
  })
  .action((options: RawOptions) => runGdoc(options))

cli
  .command('gtype', 'Generate purified types based on *.prisma')
  .option(
    '-i,--input <path>',
    'Prisma schema path, default:  ./prisma/schema.prisma',
  )
  .option('-n,--namespace <name>', 'Namespace of purified types', {
    default: 'Pure',
  })
  .option('-o,--output <string>', 'Output file path')
  .action((options: RawOptions) => runGtype(options))

cli.help()
// The package is built with `unbundle`, so this file sits at `dist/commands/index.mjs`
// and `../../package.json` is the package root in both the source and built trees.
const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string }
cli.version(version)
export { cli }

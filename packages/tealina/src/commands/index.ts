import { cac } from 'cac'
import { exitIfHasDeprecated } from '../utils/exitIfHasDeprecated'
import { loadConfig } from '../utils/tool'
import { createApis } from './capi'
import { deleteApis } from './dapi'
import { pickOption4gdoc, startGenerateDoc } from './gdoc'
import { generatePureTypes, pickOption4gtype } from './gtype'
import { pickOption4align, syncApiByFile } from './sapi'

export interface RawOptions {
  apiDir: string
  route?: string
  model: boolean
  output?: string
  input: string
  templateAlias?: string
  withTest: boolean
  tsconfigPath: string
  configPath: string
  namespace: string
  align: boolean
  deleteApi: boolean
}

const distribuite = async (...rawArgs: unknown[]) => {
  const options = rawArgs.pop() as Omit<RawOptions, 'apiDir' | 'route'>
  const args = rawArgs as ReadonlyArray<string>
  const [apiDir, route] = args
  exitIfHasDeprecated(apiDir, route, options)
  const rawOptions = { ...options, apiDir, route }
  const config = await loadConfig(rawOptions)
  if (options.align) {
    return syncApiByFile(pickOption4align(config))
  }
  if (route === 'gdoc') {
    return startGenerateDoc(pickOption4gdoc(config))
  }
  if (route === 'gtype') {
    return generatePureTypes(pickOption4gtype(config))
  }
  if (options.deleteApi) {
    return deleteApis(config)
  }
  return createApis(config)
}

const cli = cac('tealina')

cli.command('<api-dir> gdoc [options]', 'Generate API document (json format)')

cli.command(
  '<api-dir> gtype [options]',
  'Generate purified types based on schema.prisma',
)
cli.command('gtype [options]', 'Generate purified types based on schema.prisma')

cli
  .command('<api-dir> [route] [options]', 'Create APIs')
  .option(
    '-a,--align',
    'Align APIs, update all related files according to files in --api-dir',
  )
  .option('-d,--delete-api', 'Delete APIs')
  .option('-i,--input <path>', 'Prisma schema path', {
    default: './prisma/schema.prisma',
  })
  .option('-n,--namespace <name>', 'Namespace of purified types', {
    default: 'Pure',
  })
  .option('-m,--model', 'Batch create APIs by model name in the .prisma file.')
  .option(
    '-o,--output <string>',
    'Output directory (gdoc) or file path (gtype)',
  )
  .option('-t,--template-alias <alias>', 'Template alias')
  .option('--with-test', 'Affects test file too when create or delete APIs')
  .option('--tp,--tsconfig-path <path>', 'TypeScript config path', {
    default: './tsconfig.json',
  })
  .option('--config-path <path>', 'Tealina config path', {
    default: './tealina.config.mjs',
  })
  .option('--verbose', 'Show execution stack when error')
  .action(distribuite)

cli.help()
cli.version('2.0.0')
export { cli }

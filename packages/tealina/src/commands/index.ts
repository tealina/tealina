import { cac } from 'cac'
import { createApis } from './capi'
import { deleteApis } from './dapi'
import { generatePureTypes } from './gpure'
import { syncApiByFile } from './sapi'
import { registerGlobalOption } from '../utils/options'
import { startGenerateDoc } from './gdoc'

const cli = cac('tealina')

registerGlobalOption(cli)

cli
  .command('capi [route] [alias]', 'Create API')
  .option('-t,--template-alias <string>', `[string] template alias`)
  .option('--with-test', '[boolean] Generate test file too')
  .option(
    '--by-model',
    `[boolean] create batch APIs by model name in schema file`,
  )
  .option('--schema <path>', `[string] prisma schema path`, {
    default: './prisma/schema.prisma',
  })
  .action(createApis)

cli
  .command('dapi [route] [alias]', 'Delete API')
  .option('-t,--template-alias <string>', `[string] template alias`)
  .option('--with-test', '[boolean] Generate test file too')
  .action(deleteApis)

cli
  .command('gdoc', 'Generate API document (json format)')
  .option('-o,--output-dir <path>', `[string] output dir`, {
    default: 'docs',
  })
  .option('--tsconfig <path>', `[string] tsconfig file path`, {
    default: 'tsconfig.json',
  })
  .action(startGenerateDoc)

cli
  .command(
    'sapi',
    'Sync API, update all relative files according to files in --api-dir',
  )
  .action(syncApiByFile)

cli
  .command('gpure', 'Generate purifed mutation types from schema.prisma')
  .option('-i,--input <path>', `[string] input path`, {
    default: './prisma/schema.prisma',
  })
  .option('-o,--output <path>', `[string] output path`, {
    default: './types/pure.d.ts',
  })
  .option('-n,--namespace <name>', `[string] Namespace of purified types`, {
    default: 'Pure',
  })
  .action(generatePureTypes)

// Listen to unknown commands
cli.on('command:*', () => {
  console.error('Invalid command: %s', cli.args.join(' '))
  process.exit(1)
})

cli.help()

export { cli }

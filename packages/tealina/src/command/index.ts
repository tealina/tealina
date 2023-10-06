import { cac } from 'cac'
import { createApis } from '../core/capi.js'
import { deleteApis } from '../core/dapi.js'
import { generatePureTypes } from '../core/gpure.js'
import { syncApiByFile } from '../core/sapi.js'
import { registerGlobalOption } from '../utils/options.js'
import { startGenerateDoc } from './gdoc.js'

//All action should be async so the error can be catch in bin/tealina.js file

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

cli.help()

export { cli }

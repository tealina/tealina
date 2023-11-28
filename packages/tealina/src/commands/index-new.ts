import { cac } from 'cac'
import { createApis } from './capi'
import { deleteApis } from './dapi'
import { generatePureTypes } from './gpure'
import { syncApiByFile } from './sapi'
import { registerGlobalOption } from '../utils/options'
import { startGenerateDoc } from './gdoc'
import consola from 'consola'

const cli = cac('tealina')

// registerGlobalOption(cli)

cli
  .command('<api-dir> [route] [options]')
  .option(
    '-a,--align',
    'Align APIs, update all relative files according to files in --api-dir',
  )
  .option('-d --delete-api', 'Delete APIs')
  .option('-gd --generate-doc', 'Generate API document (json format)')
  .option(
    '-gt --generate-types',
    'Generate purifed mutation types from schema.prisma',
  )
  .option('-i,--input <path>', `Prisma schema path`, {
    default: './prisma/schema.prisma',
  })
  .option('-n,--namespace <name>', 'Namespace of purified types', {
    default: 'Pure',
  })
  .option('-m,--model', 'Batch Create APIs by model name in schema file')
  .option('-o,--output <string>', 'Output dir (-gd) or file path (-gt)')
  .option('-t,--template-alias <alias>', 'Template alias')
  .option('--with-test', 'Effect test file too when create or delete APIs')
  .option('--tsconfig <path>', `Typescript config path`, {
    default: './tsconfig.json',
  })
  .option('--config-path <path>', 'Tealina config path', {
    default: './tealina.config.mjs',
  })
  .option('--verbose', '[flag] show excution stack when error')

cli.help()
cli.version('1.0.0')
const input = cli.parse()
console.log(input)
export { cli }

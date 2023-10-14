import { CAC } from 'cac'

export interface TealinaComonOption {
  apiDir: string
  configPath: string
  tsconfigPath: string
}

export const registerGlobalOption = (cli: CAC) =>
  cli
    .option('--api-dir <path>', `[string] api directory path`)
    .option('--config-path <path>', '[string] tealina config path', {
      default: './tealina.config.mjs',
    })
    .option('--tsconfig-path <path>', '[string] typescript config path', {
      default: './tsconfig.json',
    })
    .option('--verbose', '[flag] show excution state when error')

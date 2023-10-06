import { CAC } from 'cac'

export interface TealinaComonOption {
  apiDir: string
  configPath: string
}

export const registerGlobalOption = (cli: CAC) =>
  cli
    .option('--api-dir <path>', `[string] api directory path`)
    .option('--config-path <path>', '[string] tealina config path', {
      default: './tealina.config.mjs',
    })

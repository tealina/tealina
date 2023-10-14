import fs, { readFileSync } from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import { pathToFileURL } from 'url'
import { CreationCtx, TealinaConifg } from '../index'
import ts from 'typescript'
import { normalize, extname } from 'pathe'

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1)

export const unCapitalize = (str: string) =>
  str.charAt(0).toLowerCase() + str.slice(1)

export const withoutSuffix = (x: string) => x.replace(extname(x), '')

export const parseCreateInfo = (
  method: string,
  fullPathArr: string[],
): CreationCtx => {
  const dirPathArr = fullPathArr.slice(0, -1)
  const relativeDotStr = Array(fullPathArr.length + 1)
    .fill('..')
    .join('/')
  const dir = dirPathArr.at(-1) ?? ''
  const filename = fullPathArr.at(-1) ?? ''
  return {
    Dir: capitalize(dir),
    dir,
    filename,
    Filename: capitalize(filename),
    relative2api: relativeDotStr,
    method,
  }
}

export const ensureWrite = (filePath: string, content: string) => {
  const dirPath = path.dirname(filePath)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  fs.writeFileSync(filePath, content)
}

export interface NewFileInfo {
  filePath: string
  genContent: () => string
}

const ExportDefaultStatementPattern = /^export default/
const takePropLines = (lines: string[]): string[] =>
  lines.slice(
    lines.findIndex(line => ExportDefaultStatementPattern.test(line)) + 1,
    lines.lastIndexOf('}'),
  )

export const readIndexFile = (indexFilePath: string): Promise<string[]> =>
  fsp.readFile(indexFilePath).then(
    v => takePropLines(v.toString().trim().split('\n')),
    () => [],
  )

export const loadConfig = async (configPath: string) =>
  import(pathToFileURL(configPath).href)
    .then(v => v.default as TealinaConifg)
    .then(v => ({
      ...v,
      typesDir: normalize(v.typesDir),
      testDir: normalize(v.testDir),
      tsconfigPath: v.tsconfigPath ? normalize(v.tsconfigPath) : void 0,
    }))

export interface TsConfig {
  compilerOptions?: {
    moduleResolution?: 'Bundler' | string
  }
}

export const getSuffix = (v: TsConfig) =>
  v.compilerOptions?.moduleResolution == 'Bundler' ? '' : '.js'

export const readTsConfig = async (tsconfigPath: string) => {
  const parsedConfig = ts.readConfigFile(tsconfigPath, p =>
    readFileSync(p).toString(),
  )
  if (parsedConfig.error) {
    throw new Error(
      parsedConfig?.error?.messageText.toString() ??
        `Error when parseing ${tsconfigPath}`,
    )
  }
  return parsedConfig.config as TsConfig
}

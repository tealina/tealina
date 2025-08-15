import { build } from 'esbuild'
import { unlink } from 'fs'
import { writeFile } from 'fs/promises'
import fs, { readFileSync } from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { extname, normalize } from 'pathe'
import ts from 'typescript'
import type { RawOptions } from '../commands'
import type { TealinaConifg, TemplateContext } from '../index'

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1)

export const unCapitalize = (str: string) =>
  str.charAt(0).toLowerCase() + str.slice(1)

export const withoutSuffix = (x: string) => x.replace(extname(x), '')

export const parseCreateInfo = (
  method: string,
  fullPathArr: string[],
): TemplateContext => {
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

export const mergeInlineOptions = (
  config: TealinaConifg,
  inlineOption: InlineOptions,
) => {
  return {
    ...config,
    typesDir: normalize(config.typesDir),
    testDir: config.testDir ? normalize(config.testDir) : void 0,
    suffix: config.suffix ?? '.js',
    ...inlineOption,
    apiDir: normalize(inlineOption.apiDir),
    route: inlineOption.route ?? '',
  }
}
type InlineOptions = RawOptions & {
  apiDir: string
  route?: string
}

export interface TsConfig {
  compilerOptions?: {
    moduleResolution?: 'Bundler' | string
  }
}

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

const transform2mjs = async (configPath: string) => {
  const result = await build({
    absWorkingDir: process.cwd(),
    entryPoints: [configPath],
    bundle: false,
    write: false,
    platform: 'node',
    format: 'esm',
    target: 'esnext',
    loader: { '.ts': 'ts' },
    sourcemap: 'inline',
  })
  const fileBase = `${configPath}.${Date.now()}-${Math.random().toString(16).slice(2)}`
  const fileNameTmp = `${fileBase}.mjs`
  await writeFile(fileNameTmp, result.outputFiles[0].text)
  return fileNameTmp
}

export const loadConfigFromPath = async (configPath: string) => {
  if (extname(configPath) === 'mjs') {
    const fileUrl = pathToFileURL(configPath).href
    return import(fileUrl).then(v => v.default)
  }
  const jsFilePath = await transform2mjs(configPath)
  const fileUrl = pathToFileURL(jsFilePath).href
  return import(fileUrl)
    .then(v => v.default)
    .finally(() => {
      unlink(jsFilePath, () => {})
    })
}

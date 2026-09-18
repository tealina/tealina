import { build } from 'esbuild'
import { unlink } from 'fs'
import { writeFile } from 'fs/promises'
import fs, { readFileSync } from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { extname, join, normalize } from 'pathe'
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
    sourceExt: config.sourceExt ?? '.ts',
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

/** The spelling tealina has always looked for, and the one `--config-path` defaults to. */
export const kDefaultConfigPath = './tealina.config.ts'

/**
 * The three spellings a tealina config is written in. `suffix`/`sourceExt` decide what the
 * generated files are called, but a project's *own* config is whatever it is — a JavaScript
 * project writes `tealina.config.js`, and asking it to also carry a `.ts` file would mean a
 * TypeScript toolchain for one file.
 */
const kConfigCandidates = [
  kDefaultConfigPath,
  './tealina.config.js',
  './tealina.config.mjs',
]

/**
 * Probed only when the caller did not name a file. An explicit `--config-path` is honoured
 * exactly as given, even when it does not exist: the failure then names the file they asked
 * for, which is more useful than quietly reading a different one.
 *
 * The candidate is returned unqualified, so `baseDir` decides where to *look* and never what
 * the config path becomes. It exists so this can be exercised without moving the process's
 * working directory.
 * @param configPath the value the CLI option carries
 * @param baseDir directory the candidates are resolved against
 */
export const resolveConfigPath = (configPath: string, baseDir = '.') =>
  configPath === kDefaultConfigPath
    ? (kConfigCandidates.find(f => fs.existsSync(join(baseDir, f))) ??
      configPath)
    : configPath

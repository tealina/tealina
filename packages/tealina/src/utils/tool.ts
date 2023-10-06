import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import { CreationCtx, TealinaConifg } from '../index.js'

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1)

export const unCapitalize = (str: string) =>
  str.charAt(0).toLowerCase() + str.slice(1)

export const withoutSuffix = (x: string) => x.replace(path.extname(x), '')

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
  import(configPath).then(v => v.default as TealinaConifg)

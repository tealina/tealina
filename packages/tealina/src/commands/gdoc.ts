import chalk from 'chalk'
import consola from 'consola'
import { isEmpty, pickFn } from 'fp-lite'
import { basename, join, normalize } from 'pathe'
import { parseDeclarationFile } from '../utils/parseDeclarationFile'
import { ensureWrite } from '../utils/tool'
import { getApiTypeFilePath } from '../utils/withTypeFile'
import type { FullOptions } from './capi'

type GdocOptions = Required<
  Pick<FullOptions, 'apiDir' | 'output' | 'input' | 'tsconfigPath' | 'typesDir'>
>

export const pickOption4gdoc = (full: FullOptions) => {
  const x = pickFn(
    full,
    'apiDir',
    'typesDir',
    'output',
    'input',
    'tsconfigPath',
  )
  const output = x.output ?? 'docs'
  return { ...x, output }
}

export const startGenerateDoc = async (options: GdocOptions) => {
  const entries = [getApiTypeFilePath(options)]
  const outputDir = options.output ?? 'docs'
  const result = parseDeclarationFile({
    entries,
    tsconfigPath: normalize(options.tsconfigPath),
  })
  const allRecords = Object.values(result).map(v => Object.values(v))
  if (allRecords.every(isEmpty)) {
    throw new Error(
      'Generate document fail! Make sure you type file is correct',
    )
  }
  const filename = `${join(outputDir, basename(options.apiDir))}.json`
  ensureWrite(filename, JSON.stringify(result, null, 2))
  consola.success(
    chalk.green(`Generate document success!, result save at ${join(filename)}`),
  )
}

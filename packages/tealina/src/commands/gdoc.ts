import type { ApiDoc } from '@tealina/doc-types'
import chalk from 'chalk'
import consola from 'consola'
import { isEmpty, pickFn } from 'fp-lite'
import { writeFileSync } from 'node:fs'
import { basename, join, normalize } from 'pathe'
import { parseDeclarationFile } from '../utils/parseDeclarationFile'
import { getApiTypeFilePath } from '../utils/withTypeFile'
import type { FullOptions } from './capi'
import path from 'node:path'

type GdocOptions = Required<
  Pick<FullOptions, 'apiDir' | 'output' | 'input' | 'tsconfigPath' | 'typesDir'>
> &
  Pick<FullOptions, 'gdoc'>

export type GdocContext = {
  outputDir: string
  apiDir: string
}

export type CustomOutputFn = (
  apiDoc: ApiDoc,
  context: GdocContext,
) => {
  content: string
  /** The storage location of the file contents */
  filePath: string
}

export interface GdocConfig {
  /** Keep the original output event customOutputs set. */
  keepOriginalOutput?: boolean
  customOutputs?: CustomOutputFn[]
}

export const pickOption4gdoc = (full: FullOptions) => {
  const x = pickFn(
    full,
    'gdoc',
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
  const defaultOutputs: CustomOutputFn = (apiDoc, context) => {
    const filePath = `${join(outputDir, basename(context.apiDir))}.json`
    return { content: JSON.stringify(apiDoc, null, 2), filePath }
  }
  const outputs = options.gdoc?.customOutputs ?? [defaultOutputs]
  const keepOriginalOutput = options.gdoc?.keepOriginalOutput ?? false
  if (keepOriginalOutput || options.gdoc == null) {
    outputs.push(defaultOutputs)
  }
  const context: GdocContext = {
    apiDir: path.basename(options.apiDir),
    outputDir,
  }
  const filenames = outputs.map(fn => {
    const { content, filePath } = fn(result, context)
    writeFileSync(filePath, content)
    return filePath
  })
  consola.success(
    chalk.green(
      [
        'Document generated successfully! Results saved at:',
        filenames.map(v => `  - ${v}`),
      ].join('\n'),
    ),
  )
}

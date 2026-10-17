import chalk from 'chalk'
import consola from 'consola'
import { isEmpty, pickFn } from 'fp-lite'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { basename, join, normalize } from 'pathe'
import { parseDeclarationFile } from '../utils/parseDeclarationFile'
import { getApiTypeFilePath } from '../utils/withTypeFile'
import type { FullOptions } from './capi'
import { CustomOutputFn, GdocContext } from '..'

type GdocOptions = Required<
  Pick<FullOptions, 'apiDir' | 'output' | 'input' | 'tsconfigPath' | 'typesDir'>
> &
  Pick<FullOptions, 'gdoc' | 'check' | 'json'>

export const pickOption4gdoc = (full: FullOptions) => {
  const x = pickFn(
    full,
    'gdoc',
    'apiDir',
    'typesDir',
    'output',
    'input',
    'tsconfigPath',
    'check',
    'json',
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
  // Copy rather than mutate `options.gdoc.customOutputs`: `--check` and a normal run can
  // both happen in one process, and pushing into the config would duplicate the default.
  const outputs = [...(options.gdoc?.customOutputs ?? [])]
  const keepOriginalOutput = options.gdoc?.keepOriginalOutput ?? false
  if (keepOriginalOutput || options.gdoc == null) {
    outputs.push(defaultOutputs)
  }
  const context: GdocContext = {
    apiDir: path.basename(options.apiDir),
    outputDir,
  }
  const rendered = outputs.map(fn => fn(result, context))
  const actionOf = (filePath: string) =>
    existsSync(filePath) ? 'update' : 'create'
  const report = (changed: { filePath: string }[]) =>
    changed.map(v => ({ action: actionOf(v.filePath), file: v.filePath }))
  const changed = rendered.filter(({ content, filePath }) => {
    try {
      return readFileSync(filePath, 'utf8') !== content
    } catch {
      return true
    }
  })

  if (options.check) {
    if (changed.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ ok: true, changed: [] }))
      } else {
        consola.success('Documentation is up to date')
      }
      return changed
    }
    if (options.json) {
      console.log(JSON.stringify({ ok: false, changed: report(changed) }))
    } else {
      changed.forEach(v => consola.error(chalk.red(`  ^ ${v.filePath}`)))
      consola.error(`Found ${changed.length} document file(s) out of date.`)
    }
    process.exitCode = 1
    return changed
  }

  // `action` has to be read before the writes below turn every `create` into an `update`.
  const written = report(changed)
  rendered.forEach(({ content, filePath }) => writeFileSync(filePath, content))
  if (options.json) {
    console.log(JSON.stringify({ ok: true, changed: written }))
    return
  }
  const filenames = rendered.map(({ filePath }) => filePath)
  consola.success(
    chalk.green(
      [
        'Document generated successfully! Results saved at:',
        filenames.map(v => `  - ${v}\n`),
      ].join('\n'),
    ),
  )
}

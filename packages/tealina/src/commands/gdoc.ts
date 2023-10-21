import chalk from 'chalk'
import consola from 'consola'
import { isEmpty } from 'fp-lite'
import { basename, join } from 'pathe'
import { TealinaComonOption } from '../utils/options'
import { parseDeclarationFile } from '../utils/parseDeclarationFile'
import { ensureWrite, loadConfig } from '../utils/tool'
import { getApiTypeFilePath } from '../utils/withTypeFile'

interface GdocOptions extends TealinaComonOption {
  outputDir: string
  tsconfig: string
}

export const startGenerateDoc = async (options: GdocOptions) => {
  const config = await loadConfig(options)
  const { outputDir, apiDir } = options
  const entries = [getApiTypeFilePath({ apiDir, typesDir: config.typesDir })]
  const result = parseDeclarationFile({
    entries,
    tsconfigPath: config.tsconfigPath,
  })
  const allRecords = Object.values(result).map(v => Object.values(v))
  if (allRecords.every(isEmpty)) {
    throw new Error(
      'Generate document fail! Make sure you type file is correct',
    )
  }
  const filename = join(outputDir, basename(apiDir)) + '.json'
  ensureWrite(filename, JSON.stringify(result, null, 2))
  consola.success(
    chalk.green('Generate document success!, result save at ' + join(filename)),
  )
}

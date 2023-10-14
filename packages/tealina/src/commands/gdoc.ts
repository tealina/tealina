import chalk from 'chalk'
import path from 'path'
import { parseDeclarationFile } from '../utils/parseDeclarationFile'
import { TealinaComonOption } from '../utils/options'
import { ensureWrite, loadConfig } from '../utils/tool'
import { getApiTypeFilePath } from '../utils/withTypeFile'
import { isEmpty } from 'fp-lite'

interface GdocOptions extends TealinaComonOption {
  outputDir: string
  tsconfig: string
}

export const startGenerateDoc = async (options: GdocOptions) => {
  const config = await loadConfig(path.resolve(options.configPath))
  const { outputDir, apiDir, tsconfigPath } = options
  const entries = [getApiTypeFilePath({ apiDir, typesDir: config.typesDir })]
  const result = parseDeclarationFile({
    entries,
    tsconfigPath,
  })
  const allRecords = Object.values(result).map(v => Object.values(v))
  if (allRecords.every(isEmpty)) {
    throw new Error(
      'Generate document fail! Make sure you type file is correct',
    )
  }
  const filename = path.join(outputDir, path.basename(apiDir)) + '.json'
  ensureWrite(filename, JSON.stringify(result, null, 2))
  console.log(
    chalk.green(
      'Generate document success!, result save at ' + path.join(filename),
    ),
  )
}

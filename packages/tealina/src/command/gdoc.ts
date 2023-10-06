import chalk from 'chalk'
import path from 'path'
import { generateApiDoc } from '../core/gdoc.js'
import { TealinaComonOption } from '../utils/options.js'
import { ensureWrite, loadConfig } from '../utils/tool.js'
import { getApiTypeFilePath } from '../utils/withTypeFile.js'

interface GdocOptions extends TealinaComonOption {
  outputDir: string
  tsconfig: string
}

export const startGenerateDoc = async (options: GdocOptions) => {
  const config = await loadConfig(path.resolve(options.configPath))
  const { outputDir, apiDir, tsconfig: tsconfigPath } = options
  const entries = [getApiTypeFilePath({ apiDir, typesDir: config.typesDir })]
  const result = generateApiDoc({
    entries,
    tsconfigPath,
  })
  const filename = path.join(outputDir, path.basename(apiDir)) + '.json'
  ensureWrite(filename, JSON.stringify(result, null, 2))
  console.log(
    chalk.green(
      'Generate document success!, result save at ' + path.join(filename),
    ),
  )
}

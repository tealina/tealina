import { readFile, writeFile } from 'node:fs/promises'
import { test } from 'vitest'
import path from 'node:path'
import { convertToOpenApiJson } from '../../src/utils/genOpenApi'

test(' api doc Conver to Open API', async () => {
  console.log(path.resolve())
  const entry = path.resolve('test/mock/api-v1.json')
  const input = await readFile(entry)
  const output = convertToOpenApiJson(JSON.parse(input.toString()))
  await writeFile('./output.json', JSON.stringify(output, null, 2))
})

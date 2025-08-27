import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { convertToOpenApiJson } from '../../src/utils/genOpenApi'

test(' api doc Conver to Open API', async () => {
  console.log(path.resolve())
  const entry = path.resolve('test/gdoc/mock/api-v1.json')
  const input = await readFile(entry)
  const output = convertToOpenApiJson(JSON.parse(input.toString()))
  await writeFile('temp/openapi.json', JSON.stringify(output, null, 2))
  expect(output.openapi).eq('3.1.1')
  expect(output.paths).toHaveProperty('/api/v1/user/{id}')
})

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { convertToOpenApiJson } from '../../src/utils/genOpenApi'

test('Convert to Open API', async () => {
  console.log(path.resolve())
  const entry = path.resolve('test/gdoc/mock/api-v1.json')
  const input = await readFile(entry)
  const output = convertToOpenApiJson(JSON.parse(input.toString()))
  await writeFile('temp/openapi.json', JSON.stringify(output, null, 2))
  expect(output.openapi).eq('3.1.1')
  // expect(output.paths).toHaveProperty('/api/v1/user/{id}')
})

test('Variants status code ', async () => {
  console.log(path.resolve())
  const entry = path.resolve('test/gdoc/mock/api-v2.json')
  const input = await readFile(entry)
  const output = convertToOpenApiJson(JSON.parse(input.toString()))
  await writeFile('temp/openapi2.json', JSON.stringify(output, null, 2))
  expect(output.openapi).eq('3.1.1')
  expect(output.paths).toHaveProperty('/api/v1/status')
  const statusRespone = (output.paths as any)['/api/v1/status']?.get?.responses
  expect(statusRespone).not.null
  expect(statusRespone).toHaveProperty('200')
  expect(statusRespone).toHaveProperty('500')
})

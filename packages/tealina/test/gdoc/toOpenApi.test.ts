import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vite-plus/test'
import { convertToOpenApiJson } from '../../src/utils/genOpenApi'

test('Convert to Open API', async () => {
  console.log(path.resolve())
  const entry = path.resolve('test/gdoc/mock/api-v1.json')
  const input = await readFile(entry)
  const output = convertToOpenApiJson(JSON.parse(input.toString()), '/api/v1')
  await writeFile('temp/openapi.json', JSON.stringify(output, null, 2))
  expect(output.openapi).eq('3.1.1')
  // expect(output.paths).toHaveProperty('/api/v1/user/{id}')
})

test('Variants status code ', async () => {
  console.log(path.resolve())
  const entry = path.resolve('test/gdoc/mock/api-v2.json')
  const input = await readFile(entry)
  const output = convertToOpenApiJson(JSON.parse(input.toString()), '/api/v1')
  await writeFile('temp/openapi2.json', JSON.stringify(output, null, 2))
  expect(output.openapi).eq('3.1.1')
  expect(output.paths).toHaveProperty('/api/v1/status')
  const statusRespone = (output.paths as any)['/api/v1/status']?.get?.responses
  expect(statusRespone).not.toBeNull()
  expect(statusRespone).toHaveProperty('200')
  expect(statusRespone).toHaveProperty('500')
})

test('Response headers become OpenAPI header objects', () => {
  const doc = {
    apis: {
      get: {
        stream: {
          response: {
            kind: 15,
            statusCode: 200,
            headers: { kind: 4, id: 1 },
            response: { kind: 4, id: 2 },
          },
        },
      },
    },
    entityRefs: {
      1: {
        name: 'StreamHeaders',
        props: [
          { kind: 7, name: 'Content-Type', value: 'text/event-stream' },
          { kind: 0, name: 'Cache-Control', type: 'string' },
        ],
      },
      2: { name: 'Event', props: [] },
    },
    enumRefs: {},
    tupleRefs: {},
    docTypeVersion: 1,
  }
  const output = convertToOpenApiJson(doc as any, '/api/v1')
  const response = (output.paths as any)['/api/v1/stream'].get.responses['200']
  expect(response.content).toHaveProperty('text/event-stream')
  expect(response.headers).toEqual({
    'Cache-Control': { required: true, schema: { type: 'string' } },
  })
  expect(Object.keys(output.components!.schemas!)).toEqual(['Event'])
})

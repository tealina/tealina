import path from 'node:path'
import {
  DocKind,
  type ResponseEntity,
  type UnionType,
} from '@tealina/doc-types'
import { expect, test } from 'vite-plus/test'
import { parseDeclarationFile } from '../../src/utils/parseDeclarationFile.js'

/**
 * The document generator recognises a rich response by the *name* TypeScript gives the
 * `ResponseFlagSymbol` property (`__@ResponseFlagSymbol@…`), which is a string convention
 * between `utility-types` and `parseDeclarationFile.js` — not a type-level one. Renaming
 * the symbol on either side compiles; the only symptom is a document that loses status
 * codes and headers.
 *
 * This fixture imports the wrappers from the published `@tealina/utility-types`, so the
 * assertion fails if the two sides ever stop agreeing.
 */
test('rich responses are recognised through the published ResponseFlagSymbol', () => {
  const mockDir = 'test/gdoc/mock'
  const result = parseDeclarationFile({
    entries: [path.join(mockDir, 'rich', 'api-v1.d.ts')],
    tsconfigPath: path.join(mockDir, 'tsconfig.json'),
  })

  const response = result.apis.get.health.response as UnionType
  expect(response.kind).eq(DocKind.Union)

  const [withStatus, withHeaders] = response.types as ResponseEntity[]
  expect(withStatus.kind).eq(DocKind.ResponseEntity)
  expect(withStatus).contains({ statusCode: 201 })
  expect(withStatus.response).not.null

  expect(withHeaders.kind).eq(DocKind.ResponseEntity)
  expect(withHeaders.headers).not.null
  expect(withHeaders.response).not.null
})

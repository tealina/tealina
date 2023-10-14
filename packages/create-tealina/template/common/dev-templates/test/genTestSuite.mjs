// @ts-check
import { makeTestSuiteTemplate } from 'tealina'

export default makeTestSuiteTemplate(({ method, route, relative2ancestor }) =>
  [
    "import { test, expect } from 'vitest'",
    `import { req } from '${relative2ancestor}/helper'`,
    '',
    `test('api ${route}',async () => {`,
    `  const result = await req.${method}('${route}',)`,
    '  expect(result.status).eq(200)',
    '})',
    '',
    '',
  ].join('\n'),
)

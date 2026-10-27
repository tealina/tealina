import { convertToOpenApiJson, defineConfig } from 'tealina'
import { API_BASE_URL } from './version.js'

/**
 * Dates cross the wire as ISO strings, so the generated types say `string` rather than
 * `Date`. One mapping, used for both the entity interfaces and the Create/Update inputs
 * that `gtype` emits.
 */
const tsScalar = (type: string) => {
  switch (type) {
    case 'Int':
    case 'Float':
    case 'Decimal':
    case 'BigInt':
      return 'number'
    case 'DateTime':
      return 'string'
    case 'Boolean':
      return 'boolean'
    case 'String':
      return 'string'
    case 'Bytes':
      return 'Buffer'
    default:
      return type
  }
}

export default defineConfig({
  apiDir: 'src/api',
  apiBaseURL: API_BASE_URL,
  // The contract layer is another package, so a relative `./handler` would not resolve.
  handlerImport: 'core/handler',
  typesDir: 'types',
  // The docs UI reads the default api.json; openapi.json is the portable spec to hand to
  // any OpenAPI 3.1 tool.
  gdoc: {
    keepOriginalOutput: true,
    customOutputs: [
      (apiDoc, { baseURL }) => ({
        content: JSON.stringify(
          {
            ...convertToOpenApiJson(apiDoc, baseURL),
            info: { title: 'Tealina Roasters API', version: '1.0.0' },
            // Paths already carry baseURL, so the server is the host root.
            servers: [{ url: '/' }],
          },
          null,
          2,
        ),
        filePath: 'docs/openapi.json',
      }),
    ],
  },
  gtype: {
    overwrite: {
      transformType: [
        {
          blockName: '*',
          keyword: '*',
          kind: '',
          transform: x => tsScalar(x.type),
        },
      ],
    },
    // The mutation interfaces take their types through `typeRemap` rather than
    // `transformType`, which only reaches the read models.
    typeRemap: tsScalar,
  },
  template: {
    handlers: [
      {
        alias: '*',
        generateFn: generateBasicCode,
      },
    ],
  },
})

// The stub takes no parameters on purpose: a function with fewer parameters is
// assignable to every framework's `HandlerAliasCore`, so this single file is correct
// for express, fastify and koa alike.
//
// Both imports are bare because the access module and the handler types live in the
// `core` package — the same specifiers in every directory of the route tree, however
// deep the file being generated.
function generateBasicCode() {
  return [
    `import type { AuthedHandler } from 'core/handler'`,
    `import { authedApi } from 'core/access'`,
    '',
    `/** TODO: describe what it does */`,
    `const handler: AuthedHandler = async () => {`,
    '  throw new Error("Handler not implemented.")',
    '}',
    '',
    '// A token is required by default. To make this route public, declare the handler',
    '// as OpenHandler and export openApi(handler) instead.',
    `export default authedApi(handler)`,
    '',
  ].join('\n')
}

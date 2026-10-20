import { defineConfig } from 'tealina'
import type { TemplateContext } from 'tealina'
import { API_BASE_URL } from './version.js'

export default defineConfig({
  apiDir: 'src/api',
  apiBaseURL: API_BASE_URL,
  // The contract layer is another package, so a relative `./handler` would not resolve.
  handlerImport: 'core/handler',
  typesDir: 'types',
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
//
// A project that still keeps `.js` handlers while it migrates sets `sourceExt: '.js'`;
// the stub then has to be JavaScript, with its types in JSDoc. `sourceExt` is what tells
// the generator which language the file will be written in.
function generateBasicCode(ctx: TemplateContext) {
  return ctx.sourceExt === '.js' ? generateJsCode() : generateTsCode()
}

function generateTsCode() {
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

function generateJsCode() {
  return [
    `import { authedApi } from 'core/access'`,
    '',
    '/**',
    ' * TODO: describe what it does',
    ` * @type {import('core/handler').AuthedHandler}`,
    ' */',
    `const handler = async () => {`,
    '  throw new Error("Handler not implemented.")',
    '}',
    '',
    '// A token is required by default. To make this route public, declare the handler',
    '// as OpenHandler and export openApi(handler) instead.',
    `export default authedApi(handler)`,
    '',
  ].join('\n')
}

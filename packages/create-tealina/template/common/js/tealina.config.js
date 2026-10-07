/**
 * No `defineConfig` import: it is an identity function whose only job is to give a
 * TypeScript config a contextual type. `@type` does the same job here. The only runtime
 * import left is `node:path`, which this config really uses — to measure the generated
 * stub's own directory rather than assume what depth it sits at.
 *
 * @typedef {import('tealina').TealinaConfig} TealinaConfig
 * @typedef {import('tealina').TemplateContext} TemplateContext
 */

import { posix } from 'node:path'

/** Where `access.js` lives. This is this project's own layout, not something the CLI knows. */
const accessDir = 'src'

/** @type {TealinaConfig} */
export default {
  typesDir: 'types',
  // The one option that makes this a JavaScript project: `align` writes `index.js` and
  // the handler stubs as `.js`. `suffix` is left at its default — the import specifiers
  // it writes are `.js`, which here is also what the files on disk are called.
  sourceExt: '.js',
  template: {
    handlers: [
      {
        alias: '*',
        generateFn: generateBasicCode,
      },
    ],
  },
}

/**
 * The stub takes no parameters on purpose: a function with fewer parameters is
 * assignable to every framework's `HandlerAliasCore`, so this single file is correct
 * for express, fastify and koa alike.
 *
 * `AuthedAPI` is one of the globals declared in `types/handler.d.ts` — no import reaches
 * the contract from here, which is the whole reason the globals exist.
 *
 * The `@type` has to sit on the `const`, not inline in the `authedApi(...)` call:
 * `authedApi` is what the generator reads to find the handler, and it looks the name up in
 * the file's scope. An inline annotation leaves it holding an expression instead of a name.
 *
 * @param {TemplateContext} ctx
 * @returns {string}
 */
function generateBasicCode({ fileDir }) {
  return [
    `import { authedApi } from '${posix.relative(fileDir, accessDir)}/access.js'`,
    '',
    '/**',
    ' * TODO: describe what it does',
    ' * @type {AuthedAPI}',
    ' */',
    `const handler = async () => {`,
    '  throw new Error("Handler not implemented.")',
    '}',
    '',
    '// A token is required by default. To make this route public, declare the handler',
    '// as OpenAPI and export openApi(handler) instead.',
    `export default authedApi(handler)`,
    '',
  ].join('\n')
}

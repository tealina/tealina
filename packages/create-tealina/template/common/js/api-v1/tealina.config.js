/**
 * No `defineConfig` import: it is an identity function whose only job is to give a
 * TypeScript config a contextual type. `@type` does the same job here. The one runtime
 * import is the api version's url constants, so the config and the mount cannot drift.
 *
 * @typedef {import('tealina').TealinaConfig} TealinaConfig
 */

import { API_BASE_URL } from './version.js'

/** @type {TealinaConfig} */
export default {
  apiDir: 'src/api',
  // The URL prefix the routes answer under. It is a deployment choice, so it lives in
  // `version.js` and is read by the mount and the frontend as well.
  apiBaseURL: API_BASE_URL,
  // The contract layer is another package, so a relative `./handler` would not resolve.
  handlerImport: 'core/handler',
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
 * `AuthedAPI` is one of the globals declared in `core/types/handler.d.ts` — no import
 * reaches the contract from here, which is the whole reason the globals exist. The
 * access call is bare for the same reason its TypeScript counterpart is: `core` is a
 * package, not a directory whose depth a generated file has to count.
 *
 * The `@type` has to sit on the `const`, not inline in the `authedApi(...)` call:
 * `authedApi` is what the generator reads to find the handler, and it looks the name up in
 * the file's scope. An inline annotation leaves it holding an expression instead of a name.
 *
 * @returns {string}
 */
function generateBasicCode() {
  return [
    `import { authedApi } from 'core/access'`,
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

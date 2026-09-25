/**
 * No `defineConfig` import: it is an identity function whose only job is to give a
 * TypeScript config a contextual type. `@type` does the same job here, and doing it this
 * way leaves the config with no runtime import at all.
 *
 * @typedef {import('tealina').TealinaConfig} TealinaConfig
 * @typedef {import('tealina').TemplateContext} TemplateContext
 */

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
 * `AuthedAPI` is one of the globals declared in `types/handler.d.ts`, which is the one
 * thing a generated file could not work out for itself: how many `../` it takes to reach
 * the contract from a directory nobody has written yet.
 *
 * The `@type` has to sit on the `const`, not inline in the `convention(...)` call:
 * `convention` is what the generator reads to find the handler, and it looks the name up
 * in the file's scope. An inline annotation leaves it holding an expression instead of a
 * name.
 *
 * @param {TemplateContext} ctx
 * @returns {string}
 */
function generateBasicCode({ relative2api }) {
  return [
    `import { convention } from '${relative2api}/convention.js'`,
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
    '// as OpenAPI and pass the marker: convention(openHandler, handler)',
    `export default convention(handler)`,
    '',
  ].join('\n')
}

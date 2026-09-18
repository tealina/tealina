import { defineConfig, TemplateContext } from 'tealina'

export default defineConfig({
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
function generateBasicCode({ relative2api }: TemplateContext) {
  return [
    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,
    `import { convention } from '${relative2api}/convention.js'`,
    '',
    `/** TODO: describe what it does */`,
    `const handler: AuthedHandler = async () => {`,
    '  throw new Error("Handler not implemented.")',
    '}',
    '',
    '// A token is required by default. To make this route public, declare the handler',
    '// as OpenHandler and pass the marker: convention(openHandler, handler)',
    `export default convention(handler)`,
    '',
  ].join('\n')
}

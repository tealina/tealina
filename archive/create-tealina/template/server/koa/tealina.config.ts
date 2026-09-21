import { defineConfig, TemplateContext } from 'tealina'

export default defineConfig({
  typesDir: 'types',
  gtype: {
    output: '../shared-types/pure.d.ts',
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

function generateBasicCode({ relative2api }: TemplateContext) {
  return [
    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,
    `import { convention } from '${relative2api}/convention.js'`,
    '',
    `/** TODO: describe what it does */`,
    `const handler: AuthedHandler = async (ctx) => {`,
    '  throw new Error("Handler not implemented.")',
    '}',
    '',
    `export default convention(handler)`,
    '',
  ].join('\n')
}

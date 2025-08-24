import { defineConfig, TemplateContext } from 'tealina'

export default defineConfig({
  template: {
    handlers: [
      {
        name: '',
        alias: '*',
        generateFn: generateBasicCode,
      },
    ],
  },
  typesDir: 'types',
  gtype: {
    output: '../shared-type/pure.d.ts',
  },
})

function generateBasicCode({ relative2api }: TemplateContext) {
  return [
    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,
    `import { convention } from '${relative2api}/convention.js'`,
    '',
    `/** TODO: describe what it does */`,
    `const handler: AuthedHandler = async (request, reply) => {`,
    '  throw new Error("Unimplement handler")',
    '}',
    '',
    `export default convention(handler)`,
    '',
  ].join('\n')
}

import { posix } from 'node:path'
import { defineConfig, TemplateContext } from 'tealina'

const typesDir = 'types'
/** Where `access.ts` lives. This is this project's own layout, not something the CLI knows. */
const accessDir = 'src'

export default defineConfig({
  typesDir,
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
// `fileDir` is the directory the stub is about to be written into, which is the one thing
// this file cannot know on its own — so the CLI hands it over and the stub is measured
// from there, rather than from a depth the config assumes the api directory sits at.
function generateBasicCode({ fileDir }: TemplateContext) {
  const from = (dir: string) => posix.relative(fileDir, dir)
  return [
    `import type { AuthedHandler } from '${from(typesDir)}/handler.js'`,
    `import { authedApi } from '${from(accessDir)}/access.js'`,
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

import { defineConfig } from '../../../src/index.js'

// The generator writes the context it was handed into the file, so a test can read the
// generated file instead of the snapshot: `runMatchedCommand` returns snapshots without
// their `code`.
export default defineConfig({
  template: {
    handlers: [
      {
        alias: '*',
        method: '*',
        name: '',
        generateFn: ctx => [ctx.method, ctx.sourceExt, ctx.fileDir].join('|'),
      },
    ],
  },
  testDir: '',
  typesDir: '',
  apiDir: 'src/api',
  apiBaseURL: '/api',
  sourceExt: '.js',
})

import type { TealinaConfig } from '../../../src'

const defineConfig = (x: TealinaConfig) => x
export default defineConfig({
  template: {
    handlers: [],
  },
  typesDir: '../types/pure.d.ts',
  gdoc: {
    customOutputs: [prop => ({ content: '', filePath: '' })],
  },
  gtype: {
    output: '',
  },
  suffix: 'ts',
})

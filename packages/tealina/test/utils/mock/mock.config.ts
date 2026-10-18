import type { TealinaConfig } from '../../../src'

const defineConfig = (x: TealinaConfig) => x
export default defineConfig({
  template: {
    handlers: [],
  },
  typesDir: '../types/pure.d.ts',
  apiDir: 'src/api',
  apiBaseURL: '/api',
  gdoc: {
    customOutputs: [() => ({ content: '', filePath: '' })],
  },
  gtype: {
    output: '',
  },
  suffix: 'ts',
})

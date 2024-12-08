import { defineConfig } from 'tsup'
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    axios: 'src/axios/index.ts',
    fetch: 'src/fetch/index.ts',
    core: 'src/core/index.ts',
  },
  dts: true,
  target: 'es6',
  outDir: 'dist',
})

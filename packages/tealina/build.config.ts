import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    {
      builder: 'mkdist',
      declaration: false,
      input: './src',
      outDir: 'dist',
      format: 'esm',
      ext: 'mjs',
    },
  ],
  clean: true,
  rollup: {
    esbuild: {
      target: 'node20',
      minify: true,
    },
  },
  failOnWarn: false,
})

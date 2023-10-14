import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    {
      builder: 'mkdist',
      declaration: false,
      input: './src',
      outDir: 'dist',
    },
  ],
  clean: true,
  rollup: {
    esbuild: {
      target: 'node18',
      minify: true,
    },
  },
  failOnWarn: false,
})

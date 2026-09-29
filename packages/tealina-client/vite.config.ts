import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    deps: { resolveDepSubpath: true },
    entry: {
      index: 'src/index.ts',
      axios: 'src/axios/index.ts',
      fetch: 'src/fetch/index.ts',
      core: 'src/core/index.ts',
    },
    dts: true,
    // 浏览器包（模板的 web 项目 import 它），下限是 es6 而不是 node20。
    target: 'es6',
    outDir: 'dist',
    format: 'esm',
    // platform 默认 'node'，会让 fixedExtension 默认为 true 并输出 .mjs/.d.mts，
    // 与 package.json 里写死的 ./dist/*.js 对不上。
    fixedExtension: false,
    clean: false,
  },
})

import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: { index: 'src/index.ts' },
    format: 'esm',
    target: 'node20',
    dts: true,
    // platform 默认 'node'，会让 fixedExtension 默认为 true 并输出 `.mjs`/`.d.mts`，
    // 与 package.json 里写死的 `./dist/index.js`、`./dist/index.d.ts` 对不上。
    fixedExtension: false,
    outDir: 'dist',
    clean: false,
  },
})

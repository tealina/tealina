import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: { index: 'src/index.ts' },
    dts: true,
    target: 'es2022',
    outDir: 'dist',
    // 这个包没有 `"type": "module"`，所以 `dist/index.js` 在 Node 眼里就是 CommonJS，
    // `main` 也指着它——改格式对使用者是破坏性变更。
    format: 'cjs',
    // platform 默认 'node' 会把 fixedExtension 也默认为 true 并输出 `.cjs`，
    // 与 package.json 里写死的 `./dist/index.js` 对不上。
    fixedExtension: false,
    clean: false,
  },
})

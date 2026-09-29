import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    // bin shim（`index.js`）直接 import `dist/utils/catchError.mjs` 和
    // `dist/commands/index.mjs`，所以 `src/` 必须 1:1 镜像到 `dist/`，不能打包。
    // `root` 让输出结构相对 `src`，而不是入口文件的公共父目录。
    entry: ['src/**/*.ts', 'src/**/*.js'],
    root: 'src',
    unbundle: true,
    // 声明文件仍由 `pnpm gen-types` 出。platform 为 node 时 `fixedExtension`
    // 默认为 true，`dts: true` 会产出 `.d.mts`，与 package.json 里写死的
    // `./dist/index.d.ts` 对不上。
    dts: false,
    format: 'esm',
    platform: 'node',
    // bin shim 引用的是 `.mjs`，与上面 `fixedExtension` 的默认值一致；写出来是因为
    // 同仓库另外两个包都把它设成了 false。
    fixedExtension: true,
    target: 'node20',
    outDir: 'dist',
    // 显式关掉：这个选项一旦打开，tsdown 会改写 package.json，为 `unbundle` 出来的
    // 每一个文件补一条 `exports` 子路径——等于把 `commands/*`、`utils/*` 这 18 个
    // 目前只有 bin shim 用的私有深路径变成公开 API。
    exports: false,
    clean: false,
  },
})

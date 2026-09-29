import { defineConfig } from 'vite-plus'

// 这个包自己的测试配置，两个入口都读它：从包目录跑 `vp test`，以及仓库根 `vp test` 里
// 那条指向包目录的 project 条目。`include` 写在这里而不是靠脚本的 `--dir test`：`--dir`
// 会把 include 的基准挪到它自己那一层，`test/**` 就一条也匹配不到了。写死 `test/**` 也
// 顺手挡住了 `temp/`——那是 e2e 产物，里面是脚手架出来的整个项目。
//
// `globalSetup` 为什么必须在 worker 之上跑，见 `test/global-setup.ts`。
export default defineConfig({
  test: {
    name: 'create-tealina',
    testTimeout: 0,
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
  },
  // 单文件产物：`index.js`（bin）和仓库根的 `cproj` 脚本都直接指向
  // `dist/index.mjs`，所以输出名不能变。platform 为 node 时 `fixedExtension`
  // 默认为 true，esm 正好给 `.mjs`。
  //
  // `chalk`/`minimist`/`prompts` 列在 `dependencies` 里，tsdown 默认把它们外置
  // —— 与现在的产物一致，不需要额外配置。
  pack: {
    entry: { index: 'src/index.ts' },
    format: 'esm',
    platform: 'node',
    target: 'node20',
    minify: true,
    // 显式关掉：这个包没写 `types`，tsdown 会退到读 tsconfig 的
    // `compilerOptions.declaration`——现在恰好没开，但哪天开了就会开始吐 `.d.mts`。
    dts: false,
    outDir: 'dist',
    clean: false,
  },
})

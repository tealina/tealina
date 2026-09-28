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
})

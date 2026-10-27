// 给 test.projects 里那些「测试写死了 cwd 相对路径」的包用。
//
// 从仓库根跑 `vp test` 时 vitest 的 root 是各个包，但 process.cwd() 是仓库根，
// 于是 packages/tealina 里 `const filePath = 'test/utils/mock/mock.prisma'`
// 这类路径就找不到了（包内跑没事，因为 cwd 就是包目录）。
// 这里把 cwd 拨回 project root，让两种跑法的行为一致。
//
// 只对需要的 project 生效：它的路径由 project 的 test.env 传进来。
const root = process.env.VITEST_PROJECT_ROOT

if (root) process.chdir(root)

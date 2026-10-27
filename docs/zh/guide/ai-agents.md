# AI 助手

Tealina 的约定对人和对 AI 是同一套，但有几条规则容易被忽略，所以生成的项目会随代码发布说明文件。

## 随项目发布的 `AGENTS.md`

脚手架写两个：

- `AGENTS.md`（项目根）：包职责、依赖方向、常用脚本。
- `backend/api-v1/AGENTS.md`：编辑端点前必须知道的规则。

第二份的核心内容：

- 用 CLI 加端点，不要手写：在 `api-v1` 里运行 `pnpm run create <method> <path>`，或在仓库根运行
  `pnpm -F api-v1 run create <method> <path>`。`run` 不能省略。
- `src/api/index.*` 和 `src/api/<method>/index.*` 是生成物，永远不要编辑；增删改处理函数后运行
  `pnpm align`。
- `apiDir` 与 `apiBaseURL` 来自 `tealina.config`；前缀本身写在 `version.js`。
- 公共产物名固定：`types/api.d.ts` 与 `exports["./api"]` 不随目录改名。
- 文件默认导出 `openApi(handler)` 或 `authedApi(handler)`；新端点默认私有。
- 类型注解写在 `const` 上；载荷用 `interface`；JSDoc 成文档，`//` 不成。
- 改完处理函数运行 `pnpm gdoc`。
- `src/mount`、`src/router`、`src/doc` 是包对宿主的封口，`core` 不能反向导入它们。

让助手在改任何端点之前先读这份文件。仓库自己的 `AGENTS.md` 描述的是本仓库的维护规则，不要把两者
混用。

## `--integrate`：把生成的项目并进现有仓库

```bash
pnpm create tealina my-app --integrate
```

项目根会多出一个 `INTEGRATION.md`，专供执行合并的 AI 助手阅读。它不参与运行时，合并完成后
可以删除。内容按“先读目标仓库 → 选形态 → 复制 → 改名 → 合并 workspace/脚本 → 安装与生成 →
接线 → 验证”的顺序组织，覆盖两种形态：

- 只把 `core` + `api-v1` 挂到现有 Express/Fastify/Koa 实例，保留目标仓库自己的 server；
- 把三个后端包整体并入现有 monorepo。

手册特意写明了类型检查看不见的坑：`tealina.config.ts` 里 `handlerImport` 和生成器 stub
的字符串、`core`/`api-v1` 必须先构建、`src/api/**/index.*` 与 `docs/api.json` 只能重新生成、
以及两边路由占用同一前缀时的表现。让助手从这份文件开始，不要只给它一份目录树。

人体阅读的版本见 [整合到现有项目](./integration.md)。

## 适合自动化的命令

```bash
pnpm -F api-v1 align --check
pnpm -F api-v1 gdoc --check
```

两条命令都只比较、不写文件；生成物过期时退出码为 1。加上 `--json` 后标准输出只有一个对象：

```json
{ "ok": false, "changed": [{ "action": "update", "file": "src/api/get/index.ts" }] }
```

错误信息始终走标准错误，所以标准输出可以直接解析。适合放进 CI、提交前钩子或代理循环里。

## 本仓库的 `llms.txt`

仓库根目录的 `llms.txt` 按 LLM 习惯列出了入口：README、脚手架说明、架构文档、各包 README。
它指向的是文档源文件，不是站点 URL。

## 环境

Node ≥ 22 是硬性要求。类型检查器是最后的安全网：破坏客户端类型或文档投影的改动会让 `tsc` 失败，
而不是在运行时才暴露。

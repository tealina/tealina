# 整合到现有项目

脚手架生成的是一个独立、可直接启动的项目。如果目标是一个已经有 server、目录结构和
workspace 的仓库，更常见的做法不是把整棵生成树搬进去，而是只取需要的部分。

`--integrate` 就是为这件事准备的：

```bash
pnpm create tealina my-app --integrate
```

它会在项目根写入 `INTEGRATION.md`。这份文件不属于运行时，没有任何代码导入它；它是写给 AI
助手的合并手册，合并完成后可以删除。下面说明它覆盖的两种形态和几个容易出错的点。

## 两种形态

| 形态 | 复制 | 留在原处 |
| --- | --- | --- |
| **A. 挂到现有服务** | `backend/core`、`backend/api-v1` | `backend/server`、`packages/web`、根脚本 |
| **B. 并入现有 monorepo** | `backend/core`、`backend/api-v1`、`backend/server` | `packages/web`（除非需要） |

### A. 挂到现有服务

目标仓库已经有一个 Express/Fastify/Koa 应用、自己的入口和部署方式时用这一种。复制 `core`
和 `api-v1`，在现有 app 上调用一次 `mount`：

```ts
import { mount } from '<api>/mount'

const source = await mount(app)
```

`mount` 会装上这个版本的路由、请求体解析器和 JSON 文档路由，返回的 `TealinaVdocSource`
只有文档页需要。文档页是可选的：把生成项目的 `server/src/doc.ts` 与 `public/` 一起复制过去，
或者完全跳过，只保留 `<API_BASE_URL>/_doc/api.json`。

`backend/server` 不是要复制的东西。它展示的是宿主该怎么接，copy 它的 `app.ts` 思路即可。

### B. 并入现有 monorepo

把三个后端包复制到目标仓库，按现有习惯放进 `backend/` 或 `apps/`。然后：

- 把目录加入 workspace globs，并合并 `pnpm-workspace.yaml` 里的 `allowBuilds`、`catalog`、
  `overrides`，不要整份替换。
- 合并根脚本，不要覆盖。`dev` 必须先构建 `core`、再构建 `api-v1`：宿主导入的是它们的
  `dist/`。
- 只有目标仓库本来就用 Vite+ 时，才合并根 `vite.config.ts` 的 `fmt`/`lint` 配置。
- 不要用脚手架的 `README.md`、`AGENTS.md` 覆盖目标仓库的同名文件，只把 `api-v1` 的规则
  摘进去。

如果目标不是 Express/Fastify/Koa，先停下来。`core/types/alias.d.ts` 绑定的是这三个框架的
请求/响应类型，换框架是新增一份 alias，不是机械迁移。

## 改名

`core`、`api-v1`、`server` 都是通用名字，目标仓库里通常已经被占用。改名时除了
`package.json` 和源码里的裸导入，还有两处类型检查看不见：

1. `tealina.config.ts` 的 `handlerImport`。
2. 同一文件里 `generateTsCode` / `generateJsCode` 返回的字符串。它们决定 `create` 之后写出的
   新处理函数导入哪个包；漏改时下一次加端点才会坏，中间没有任何报错。

固定产物名不随改名变化：`types/api.d.ts`、`exports["./api"]`、`apiDir`。

## 构建与生成物

`core` 的 `exports["./access"]` 和 `api-v1` 的 `exports["./mount"]` 的 `import` 条件指向
`dist/`，所以宿主导入前必须先构建这两个包（顺序 `core → api-v1`）。

不要手工合并生成物：

| 文件 | 由谁生成 |
| --- | --- |
| `api-v1/src/api/index.*`、`api-v1/src/api/<method>/index.*` | `align` |
| `api-v1/docs/api.json` | `gdoc` |

两条命令都支持 `--check`（只比较，过期时退出码 1）和 `--json`。把 `--check` 接进目标仓库
的 CI，否则文档过期时页面仍然渲染，只是内容是旧的。

## 验证清单

在目标仓库根目录，把 `<core>`、`<api>` 换成改名后的包名：

```bash
pnpm install
pnpm -F <core> build
pnpm -F <api> build

pnpm -F <api> align --check
pnpm -F <api> gdoc --check
# 任一退出 1 时
pnpm -F <api> align
pnpm -F <api> gdoc
```

然后启动目标服务，依次确认：

1. `curl -i <API_BASE_URL>/health` 返回 200。
2. 受保护端点在没有 `Authorization` 时返回 401 —— 脚手架的守卫是占位实现，
   替换 `core/src/access/verifyToken.ts`。
3. `curl <API_BASE_URL>/_doc/api.json` 能取到文档。
4. 如果接了文档页，`/api-doc/index.html` 可打开。
5. 前端仍然能对 `<api>/api` 做类型检查。

脚手架自带的 `get/health`、`post/login`、`post/article` 是示例。第 1 步通过后，删除不需要的
端点并重新运行 `align` 与 `gdoc`。

## 会静默失败的地方

- **复制了包但没有构建。** `core/access` 和 `api-v1/mount` 在运行时解析到 `dist/`，缺失时是
  `ERR_MODULE_NOT_FOUND`，而类型检查仍然是绿的。
- **`handlerImport` 或 stub 字符串还写着旧的 `core`。** 类型检查通过，下一次 `create`
  才写出坏导入。
- **手工改过生成的 barrel。** 下一次 `align` 会悄悄覆盖。
- **改了处理函数但没有 `gdoc`。** 文档页照常渲染，只是内容过期。
- **两个路由占用了同一前缀。** 请求落到先注册的那个，另一个 404，而两边的类型都是对的。
- **目标框架的大版本与模板不同。** `alias.d.ts` 可能仍然能编译，但描述的是另一套
  `req`/`res`；要对比安装的类型，而不是版本号。
- **Node < 22。** 失败点通常在依赖的构建或运行时，而不是在类型检查里。

完整的分步手册（含两种形态的复制范围、改名搜索命令、各框架的挂载示例）在生成项目的
`INTEGRATION.md` 中，可以直接交给执行合并的 AI 助手。

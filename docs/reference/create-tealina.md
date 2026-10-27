# create-tealina

Tealina 的脚手架。生成一个可直接编译、启动的 Node API 服务，文件即路由，处理函数的类型注解
是路由、文档和客户端类型的唯一来源。

```bash
pnpm create tealina my-app
npm create tealina@latest my-app
bun create tealina my-app
```

## 参数

| 参数 | 作用 |
| --- | --- |
| `--template express\|fastify\|koa` | 跳过框架选择 |
| `--web` | 额外生成 `packages/web`，一个最小的 Vite 前端 |
| `--integrate` | 在项目根写入 `INTEGRATION.md`，一份供 AI 助手使用的整合手册 |

项目名与 `--template` 同时给出时完全非交互：

```bash
pnpm create tealina my-app --template fastify --web
```

目标目录非空时，脚手架会询问是否删除；非交互运行请使用新目录或空目录。

### 环境要求

- Node ≥ 22。
- TypeScript `>=5.6.2 <7`。生成的 `tealina` 命令需要 TypeScript Compiler API；TypeScript 7
  当前最新版 7.0.2 尚未提供该 API，暂不支持。
- pnpm ≥ 11，用于 `pnpm install`——生成的 `pnpm-workspace.yaml` 使用 `allowBuilds`，更早的
  pnpm 会忽略它。脚手架本身不安装依赖，只打印首次运行的命令。

## 生成内容

```text
my-app/
  package.json            脚本委托给三个后端包
  pnpm-workspace.yaml     backend/* 与 packages/*
  INTEGRATION.md          仅 --integrate，给 AI 助手的整合手册
  backend/
    core/                 契约层
    api-v1/               一个 API 版本
    server/               宿主
  packages/web/           仅 --web
```

- `core`、`api-v1`、`server` 的职责见 [项目结构](/guide/project-structure.md)。
- 默认端点：`GET /health`、`POST /login`（公开），`POST /article`（需要鉴权，带请求体和类型化响应）。
- 默认没有前端；`--web` 才会创建 `packages/web`。
- 默认没有数据库或 Prisma 层。
- 不附带错误处理和 404 处理，未知路由和抛出的错误交给框架默认行为。
- `--integrate` 写入的 `INTEGRATION.md` 覆盖两种整合形态：只把 `core` + `api-v1` 挂到现有
  Express/Fastify/Koa 实例，或把三个后端包整体并入现有 monorepo。它不属于运行时，合并完成后
  可以删除。完整说明见 [整合到现有项目](/guide/integration.md)。

## 根脚本

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 构建 `core` 与 `api-v1`，然后并行启动所有 watcher |
| `pnpm build` | 构建所有包 |
| `pnpm start` | 运行编译后的服务器 |
| `pnpm check` | 格式化、lint 和类型检查（Vite+） |
| `pnpm fmt` / `pnpm lint` | 只运行 `check` 的一半 |
| `pnpm -F api-v1 run create <method> <path>` | 创建处理函数存根 |
| `pnpm -F api-v1 align` | 重建生成的 `index.*` |
| `pnpm -F api-v1 gdoc` | 重新生成 API 文档 |

各包暴露自己的子集：`core` 有 `dev` / `build`，`server` 额外有 `start`，`web`（`--web`）有
`dev` / `build` / `preview`。

## 生成项目的工具链

生成的 `pnpm-workspace.yaml` 自带依赖目录，把 `vite` 别名到与 `vite-plus` 1.3.0 匹配的
`@voidzero-dev/vite-plus-core`。这是项目自己的版本固定；升级全局 `vp` 不会改变它。

## 部署前

- `pnpm -F server build` 之后用 `pnpm start` 运行。
- 文档 JSON 文件由 `gdoc` 生成，不手工编辑；页面提示文件缺失时先运行 `gdoc`。
- 鉴权守卫只是占位实现，替换 `backend/core/src/access/verifyToken.ts` 里的 `TODO`。

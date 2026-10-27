# 项目结构

脚手架生成的后端由三个工作区包组成，每个包只做一件事。依赖方向是单向的：

```text
core → api-v1 → server
              ↗
packages/web（--web 时）
```

`pnpm -r build` 是拓扑顺序，所以被依赖的包总会在依赖它的包之前构建。

## 生成树

```text
my-app/
  package.json            脚本委托给三个后端包
  pnpm-workspace.yaml     backend/* 与 packages/*
  backend/
    core/                 契约层
      types/              处理函数类型、公共形状、框架别名
      src/access/         openApi / authedApi，以及 authedApi 安装的守卫
    api-v1/               一个 API 版本
      src/api/            get/health.ts、post/login.ts、post/article.ts
      src/                router.ts、doc.ts、mount.ts
      version.js          API_VERSION 与 API_BASE_URL
      types/api.d.ts      契约的出口（exports["./api"]）
      tealina.config.ts   apiDir / apiBaseURL / typesDir / handlerImport
      docs/api.json       gdoc 生成的文档
    server/               宿主
      src/                app.ts、doc.ts、index.ts、静态资源路由
      public/             由静态资源路由提供
  packages/web/           仅 --web
    src/
      main.ts             页面
      api/client.ts       从 api-v1 处理函数推导出的 req
```

## `backend/core`：契约层

`core` 不包含任何路由。它定义“处理函数是什么”，并把这个定义通过自己的 `exports` 暴露给其他包。

| 文件 | 作用 |
| --- | --- |
| `types/handler.d.ts` | `OpenHandler` / `AuthedHandler`，以及派生文档与客户端类型的投影 |
| `types/alias.d.ts` | 唯一的框架相关文件：把 Express / Fastify / Koa 的请求和响应类型绑定到通用处理函数形状 |
| `types/common.d.ts` | `AuthedLocals`、`AuthHeaders`、`JsonHeaders` 等共享形状 |
| `src/access/index.ts` | `openApi` / `authedApi` 两种文件结尾方式 |
| `src/access/verifyToken.ts` | `authedApi` 放在链首的守卫 |

`exports` 暴露三个入口：`./handler`、`./common`（两者都是纯类型）和 `./access`（运行时）。
因此处理函数无论位于路由树的哪一层，导入说明符都是 `core/handler`、`core/access`，没有相对路径要数。

## `backend/api-v1`：一个 API 版本

`api-v1` 拥有一个版本的完整生命周期：路由树、路由器、文档来源和挂载。

| 文件 | 作用 |
| --- | --- |
| `src/api/` | 路由树。第一层是 HTTP 方法，文件路径就是 URL |
| `src/router.ts` | 把 `align` 生成的汇总导出文件交给 `@tealina/server`，变成框架路由 |
| `src/doc.ts` | 发布本版本的 `docSource`，并在 `<API_BASE_URL>/_doc/api.json` 提供 JSON 文件 |
| `src/mount.ts` | 把请求体解析器、路由和文档 JSON 文件挂到框架实例上，返回 `docSource` |
| `version.js` | `API_VERSION` 与 `API_BASE_URL` 的唯一写法 |
| `types/api.d.ts` | 契约出口。`ApiTypesForDoc` 必须是第一个导出，`ApiTypesForClient` 紧随其后 |
| `tealina.config.ts` | `apiDir`、`apiBaseURL`、`typesDir`、`handlerImport` |

`exports` 暴露三个入口：

- `./api`：只有 `types` 条件，指向 `types/api.d.ts`。前端必须用 `import type`。
- `./version`：运行时的 `API_VERSION` / `API_BASE_URL`。
- `./mount`：`types` 指向 `src/mount.ts`，`import` 指向 `dist/mount.js`。宿主通过它编译并挂载整个路由树。

公共产物的名字是固定的：`types/api.d.ts`、`docs/api.json`、`exports["./api"]`。移动或重命名
`apiDir` 只会改变路由发现和处理函数自己的导入，不会改变任何对外名字。

## `backend/server`：宿主

`server` 创建框架实例、读取 `.env`、挂载每个 API 版本，并提供文档页和静态资源。它不拥有路由：

- `src/app.ts` 调用每个版本的 `mount`，收集返回的 `docSource`。
- `src/doc.ts` 用 `@tealina/doc-ui` 的 `assembleHTML` 生成唯一一个文档页，列出宿主挂载的所有版本。
- `src/index.ts` 开始监听 `PORT`。

错误处理和 404 不随脚手架提供，交给框架默认行为（Express 的 `finalhandler`、Koa 的
`ctx.onerror`），应用可以按自己的策略接管。

## `packages/web`：可选前端

只有 `--web` 时生成。它是一个没有 UI 框架的 Vite 项目，演示的是客户端而不是页面：

- `src/api/client.ts` 从 `api-v1/api` 导入 `ApiTypesForClient`，创建 `req`。
- `src/main.ts` 调用 `GET /health` 并把结果写进页面，可以直接删掉重写。
- `vite.config.ts` 把 `API_BASE_URL` 代理到 `http://localhost:8000`，所以后端模板不需要 CORS。

## 第二个 API 版本

新增 `backend/api-v2`，让它依赖 `core`，然后由 `server` 与 `api-v1` 并列挂载。`core` 和前端都
不写死版本号；每个版本发布自己的文档 JSON 文件，宿主把所有 `docSource` 交给同一个文档页。

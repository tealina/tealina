# 前端客户端

脚手架默认只生成后端。`--web` 会额外生成 `packages/web`：一个没有 UI 框架的 Vite 项目，用来演示
客户端如何直接从服务端处理函数的类型得到路径、载荷和响应。

```bash
pnpm create tealina my-app --web
```

前端开发服务器是 `http://localhost:5173`，它把 API 前缀代理到 `http://localhost:8000`。

## 生成的两个文件

```text
packages/web/
  index.html
  vite.config.ts
  src/
    main.ts            页面：调用 GET /health 并渲染结果
    api/client.ts      req：类型来自 api-v1 的处理函数
```

`src/api/client.ts` 是重点：

```ts
import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'api-v1/api'
import { API_BASE_URL } from 'api-v1/version'

export const base = API_BASE_URL

let token = ''
export const setToken = (next: string) => {
  token = next
}

const requester = async (url: string, config: RequestInit) => {
  const headers = new Headers(config.headers)
  headers.set('Content-Type', 'application/json')
  if (token !== '') headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${base}${url}`, { ...config, headers })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  return response.json()
}

export const req = createFetchClient<ApiTypesForClient, RequestInit>(requester)
```

- `ApiTypesForClient` 通过 `api-v1` 的 `exports["./api"]` 到达这里，是处理函数注解的客户端投影。
- `API_BASE_URL` 与后端挂载、文档 JSON 文件使用同一个值，改前缀只改 `version.js`。
- `import type` 是必需的：`./api` 只发布 `types` 条件，没有运行时模块。

`src/main.ts` 只做一件事：

```ts
import { req } from './api/client'

const health = await req.get('health')
const isOk: boolean = health.isOk
```

`isOk` 的类型来自 `GET /health` 处理函数的响应注解。前端没有第二份 API 声明；**改了处理函数里的
字段，这一行会编译失败**，这正是目的。

`main.ts` 是占位页面，可以直接删掉，在 `src/` 里写自己的应用。

## 调用约定

端点键是逻辑路径，不带前导斜杠：

```ts
await req.get('health')
await req.get('user/:id', { params: { id: 'u1' } })
await req.post('article', { body: { title: 'Hello' } })
```

RPC 风格按路径段嵌套：

```ts
import { createFetchRPC } from '@tealina/client'

const rpc = createFetchRPC<ApiTypesForClient, RequestInit>(requester)

await rpc.get.health()
await rpc.get.user[':id']({ params: { id: 'u1' } })
```

两种风格、fetch/axios 适配器和原始响应的完整说明见
[@tealina/client](/reference/client.md)。

## 代理与同源

`vite.config.ts` 把 `API_BASE_URL` 代理到 `http://localhost:8000`：

```ts
import { defineConfig } from 'vite-plus'
import { API_BASE_URL } from 'api-v1/version'

export default defineConfig({
  server: {
    proxy: { [API_BASE_URL]: 'http://localhost:8000' },
  },
})
```

页面和 API 因此在开发时同源，后端模板不需要发送 CORS 头。`PORT` 不是 8000 时，修改这里的代理目标。

## 没有 `--web` 时添加前端

前端没有任何脚手架特有的机制。在 `packages/web/package.json` 里声明依赖：

```json
{
  "devDependencies": {
    "api-v1": "workspace:*"
  }
}
```

在仓库根运行 `pnpm install` 建立链接，然后：

```ts
import type { ApiTypesForClient } from 'api-v1/api'
```

同样必须用 `import type`。

## 两点注意

- 解析这些类型会把处理函数的**源码**拉进来（`api.d.ts` → `api-v1/src/` → `core` → 框架 →
  `tealina/utility-types`）。后端的 `tealina` 和框架类型包要一直安装着；前端的 `skipLibCheck`
  不能掩盖这里的错误，因为解析的是 `.ts`，不是 `.d.ts`。
- `@tealina/client` 仅支持 ESM。Axios 不是它的运行时依赖，axios 适配器只要求你传入自己的
  请求函数。

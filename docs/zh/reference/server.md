# @tealina/server

Tealina 文件路由的运行时部分。它解析 `tealina align` 写出的惰性 `import()` 汇总导出文件，并压平成框架
可以注册的路由列表。

零依赖，只有两个导出：

| 导出 | 作用 |
| --- | --- |
| `loadAPIs` | 等待两层惰性导入树，返回普通处理函数 |
| `transformToRouteOptions` | 把它压平成 `{ method, url, handler }` 列表 |

```bash
npm install @tealina/server
```

要求 Node ≥ 22。

## 读取的汇总导出文件

`align` 为每个方法目录写一个汇总导出文件，再在 API 根目录写一个：

```ts
// api/get/index.ts
export default {
  health: import('./health.js'),
  'user/:id': import('./user/[id].js'),
}

// api/index.ts
export default {
  get: import('./get/index.js'),
  post: import('./post/index.js'),
}
```

每一层都是“一个模块的 Promise”，模块的 `default` 由下一层描述。`loadAPIs` 等待两层，返回：

```ts
Record<method, Record<path, handler>>
```

路径键保持逻辑形式——`'health'`、`'user/:id'`——不带前导斜杠。

## 注册路由

### Express

```ts
import { Router } from 'express'
import type { RequestHandler } from 'express'
import apis from './api/index.js'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options'

export const buildRouter = async () => {
  const apiRecord = await loadAPIs(apis)
  const router = Router()
  for (const { url, method, handler } of transformToRouteOptions<RequestHandler[]>(
    apiRecord,
  )) {
    router[method as HttpMethod](url, handler)
  }
  return router
}
```

Express 接受处理函数数组作为最后一个参数，所以“守卫 + 端点”的链可以原样注册。

### Koa

```ts
import Router from '@koa/router'
import type { Middleware } from 'koa'
import apis from './api/index.js'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'

const router = new Router({ prefix: '/api/v1' })
const apiRecord = await loadAPIs(apis)

for (const { url, method, handler } of transformToRouteOptions<unknown[]>(apiRecord)) {
  router[method as HttpMethod](url, ...(handler as Middleware[]))
}
```

Koa 把中间件作为独立参数接收，所以链需要展开。

### Fastify

```ts
const apiRecord = await loadAPIs(apis)

for (const { url, method, handler } of transformToRouteOptions<unknown[]>(apiRecord)) {
  fastify.route({
    url,
    method: method.toUpperCase() as HTTPMethods,
    preHandler: handler.slice(0, -1) as preHandlerHookHandler[],
    handler: handler.at(-1) as RouteHandlerMethod,
  })
}
```

Fastify 把钩子和路由处理函数分开：最后一个元素始终是处理函数，前面的都是 `preHandler`。

## `transformToRouteOptions(apiRecord)`

把 `{ method: { url: handler } }` 压平成 `{ method, url, handler }` 数组。两个行为需要知道：

- **URL 变成绝对路径。** 汇总导出文件的键是逻辑路径，但路由器期望前导斜杠。已经以 `/` 开头的键保持
  不变，所以转换是幂等的。
- **静态路径先于参数化路径注册。** 不含 `:` 的路径排在前面；组内更深的路径优先。这样 `/:id`
  不会遮蔽同级的静态路由（如 `/health`）。

`handler` 是泛型，传入你的框架注册时需要的形状即可；裸函数和中间件数组都合法。

## 排序示例

```ts
const routes = transformToRouteOptions({
  get: {
    'user/:id': handlerA,
    'user/me': handlerB,
    'user/:id/posts': handlerC,
  },
})
// [
//   { method: 'get', url: '/user/me', handler: handlerB },
//   { method: 'get', url: '/user/:id/posts', handler: handlerC },
//   { method: 'get', url: '/user/:id', handler: handlerA },
// ]
```

## 这个包不做什么

鉴权、请求体解析、挂载前缀和文档都是宿主的事。处理函数链到达时已经排好序——`authedApi` 把守卫放在
最前，`openApi` 原样保留处理函数——这个包只负责原样注册。

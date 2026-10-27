# 鉴权

**每个端点默认要求 `Authorization` 头。** 一个端点是否公开，由它自己的文件结尾决定，而不是由
路由器里的路径表决定。

```ts
// src/api/get/health.ts —— 公开
export default openApi(handler)

// src/api/post/article.ts —— 需要 Authorization
export default authedApi(handler)
```

`authedApi` 不是路由器识别的标记：它在运行时把 `verifyToken` 放到中间件链首位，守卫会和其他
中间件一起被注册。一个新端点在你明确说“公开”之前，一直是私有的。

## 鉴权由三块组成

`openApi` 和 `authedApi` 是脚手架附带的通用实现，也是自定义鉴权时最小、可参考的实现。真正把
鉴权接进路由的，是下面三块：

| 部件 | 位置 | 作用 |
| --- | --- | --- |
| `headers` | 处理函数类型 | 描述请求头。`gdoc` 把它写进 API 文档，前端也从同一份类型得到请求头类型 |
| `locals` | 处理函数类型、守卫 | 声明处理函数能读到的框架上下文：Express 的 `res.locals`、Koa 的 `ctx.state`、Fastify 的 `request.locals` |
| 守卫 | `authedApi` | 在运行时被放到中间件链首位；它校验凭证，并把结果写进 `locals` |

`backend/core/types/common.d.ts` 定义默认的形状：

```ts
export type AuthedLocals = {
  userId: string
}

export type AuthHeaders = {
  Authorization: string
}

export type JsonHeaders = {
  'Content-Type': 'application/json'
}
```

`AuthedHandler` 在载荷之外带上 `AuthHeaders & JsonHeaders` 和 `AuthedLocals`；`OpenHandler`
只带 `JsonHeaders`。因此：

- 守卫写入的字段必须出现在 `AuthedLocals` 里，处理函数才能直接读取。
- 请求头的形状只写一次：API 文档和前端类型都从处理函数类型派生。
- 类型不负责运行时。`openApi` 与 `authedApi` 的差别，只在有没有把守卫放进链里。

## 默认守卫做什么

`verifyToken` 位于 `backend/core/src/access/verifyToken.ts`：

- 没有 `Authorization` 头时直接返回 `401`，响应体是：

  ```json
  { "code": "Unauthorized", "message": "Authorization header is missing." }
  ```

- 有头时写入用户上下文，然后继续：
  - Express：`res.locals.userId`
  - Koa：`ctx.state.userId`
  - Fastify：`request.locals.userId`

脚手架里的守卫只检查头是否存在，并把 `userId` 设为占位值。把 `TODO` 替换成真正的 token 校验。

## 验证

```bash
curl -i -X POST localhost:8000/api/v1/article
# 401

curl -i -X POST localhost:8000/api/v1/article \
  -H 'Authorization: anything'
# 200
```

登录端点是公开的，前端先调用它拿到 token，再把 token 交给客户端：

```ts
import { req, setToken } from './api/client'

const { token } = await req.post('login', {
  body: { account, password },
})
setToken(token)

await req.post('article', { body: { title: 'hello', content: '...' } })
```

## 类型检查的边界

默认的两个调用名也对应两个处理函数类型：`openApi` 链声明为 `OpenHandler`，`authedApi` 链声明为
`AuthedHandler`。在 Express 和 Koa 上，这对关系会被检查：

- `openApi(anAuthedHandler)` 无法编译：读取 `res.locals.userId` 的处理函数不能放在公开路由上。

仍有两个已测量过的缺口：

- `authedApi(anOpenHandler)` 在所有框架上都能编译，并且照样安装守卫。路由会比类型声明的更严格，
  这是安全方向上的偏差。
- Fastify 两种都不检查。`FastifyRequest` 通过模块增强带上了 `locals`，两种处理函数解析成同一个
  请求类型，因此两个调用接受相同的集合。

## 自定义鉴权

### 替换默认实现

如果整个项目只需要一种鉴权，直接改默认的三处即可：

1. `backend/core/types/common.d.ts` 里的 `AuthHeaders` 和 `AuthedLocals`
2. `backend/core/src/access/verifyToken.ts` 里的校验和上下文写入
3. 需要时，修改 `401` 的响应体

例如改成 API Key（下面以 Express 为例）：

```ts
// backend/core/types/common.d.ts
export type AuthHeaders = {
  'x-api-key': string
}

export type AuthedLocals = {
  apiKey: string
}
```

```ts
// backend/core/src/access/verifyToken.ts
import type { RequestHandler } from 'express'

export const verifyToken: RequestHandler = (req, res, next) => {
  const key = req.headers['x-api-key']
  if (typeof key !== 'string' || key !== process.env.API_KEY) {
    res.status(401).json({
      code: 'Unauthorized',
      message: 'x-api-key header is invalid.',
    })
    return
  }
  res.locals.apiKey = key
  next()
}
```

现有的 `authedApi(handler)` 和 `AuthedHandler` 不需要改调用处：处理函数类型里的 `headers` 与
`locals` 会跟着 `common.d.ts` 一起变化，API 文档和前端类型也随之更新。

### 新增一套 `AuthByKeyApi`

需要让两种鉴权并存时，不要改默认定义，另写一个守卫和包装函数。它和 `authedApi` 的结构相同：
**类型声明请求头和上下文，包装函数把守卫放到链首。**

```ts
// backend/core/src/access/authByKey.ts
import type { RequestHandler } from 'express'
import type { OpenHandler } from '../../types/handler.js'

export type ApiKeyHeaders = {
  'x-api-key': string
}

export type ApiKeyLocals = {
  apiKey: string
}

// 复用 OpenHandler：它不带 Authorization，只带 JsonHeaders 和这里声明的 key 头。
export type ApiKeyHandler<
  TPayload extends { body?: unknown; params?: unknown; query?: unknown } = {},
  TResponse = unknown,
> = OpenHandler<
  TPayload & { headers: ApiKeyHeaders },
  TResponse,
  ApiKeyLocals
>

export const verifyKey: RequestHandler = (req, res, next) => {
  const key = req.headers['x-api-key']
  if (typeof key !== 'string' || key !== process.env.API_KEY) {
    res.status(401).json({
      code: 'Unauthorized',
      message: 'x-api-key header is invalid.',
    })
    return
  }
  res.locals.apiKey = key
  next()
}

// 载荷字段写成 any：约束不能反过来收窄处理函数自己声明的 body。
type AnyKeyPayload = {
  body: any
  params: any
  query: any
  headers: ApiKeyHeaders
}

type AuthByKeyApiType = <
  const T extends [
    ...RequestHandler[],
    OpenHandler<AnyKeyPayload, any, ApiKeyLocals>,
  ],
>(
  ...handlers: T,
) => T

export const AuthByKeyApi: AuthByKeyApiType = (...handlers) => {
  // 和 authedApi 一样原地 unshift：处理函数必须留在末位，文档生成器从末位读取类型。
  handlers.unshift(verifyKey)
  return handlers
}
```

再从 `backend/core/src/access/index.ts` 导出，项目里就能通过 `core/access` 使用：

```ts
export { AuthByKeyApi, verifyKey } from './authByKey.js'
export type {
  ApiKeyHandler,
  ApiKeyHeaders,
  ApiKeyLocals,
} from './authByKey.js'
```

处理函数声明 `ApiKeyHandler`，就能直接读到类型化的请求头和上下文：

```ts
// backend/api-v1/src/api/get/orders.ts
import { AuthByKeyApi } from 'core/access'
import type { ApiKeyHandler } from 'core/access'

type Handler = ApiKeyHandler<
  { body: { orderId: string } },
  { orders: string[] }
>

const handler: Handler = async (req, res) => {
  const key = req.headers['x-api-key'] // string
  const apiKey = res.locals.apiKey // string
  const orderId = req.body.orderId // string
  res.send({ orders: [key, apiKey, orderId] })
}

export default AuthByKeyApi(handler)
```

`ApiKeyHandler` 是 `OpenHandler` 的一个具体别名：它只描述这一套鉴权的请求头和上下文，名字让调用处
更清楚。真正安装守卫的是 `AuthByKeyApi`，而 `AnyKeyPayload` 让包装函数只接受声明了 `x-api-key`
的处理函数。

在 Express 和 Koa 上，默认的 `openApi` 和 `authedApi` 都不接受 `ApiKeyHandler`：它们的约束没有
声明 `x-api-key`，而 `ApiKeyHandler` 要求它。因此需要 API Key 的处理函数不会被误接到公开路由上，
也就不会漏装 `verifyKey`。

反方向是允许的：`AuthByKeyApi(anOpenHandler)` 可以编译，因为一个只读普通请求头的处理函数，
放进要求更多请求头的链里是安全的。这和 `authedApi(anOpenHandler)` 的偏差方向相同。Fastify 的
类型本来就不检查请求头，默认包装函数和 `AuthByKeyApi` 接受同一组处理函数。

### 其他框架

上面的例子以 Express 为例。换成 Koa 或 Fastify 时，替换守卫的签名和上下文位置：

| 框架 | 守卫类型 | 上下文 |
| --- | --- | --- |
| Express | `RequestHandler` | `res.locals` |
| Koa | `Middleware` | `ctx.state` |
| Fastify | `preHandlerAsyncHookHandler` | `request.locals` |

包装函数最后的约束要使用对应框架的 `OpenHandler`。Fastify 的守卫还需要把
`res.status(...).json(...)` 换成 `reply.code(...).send(...)`。另外，Fastify 通过
`backend/core/types/fastify.d.ts` 把 `request.locals` 固定声明成 `AuthedLocals`；新增一套
`locals` 时，要同步调整这个模块增强，否则守卫写入新字段会通不过类型检查。

## 相关

- [处理函数契约](./handler-contract.md)
- [前端客户端](./frontend.md)

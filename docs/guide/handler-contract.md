# 处理函数契约

一个处理函数的类型注解，是路由、API 文档和前端客户端类型的共同来源。注解写错，三处会一起错；
注解改了，三处会一起跟着变。

## 处理函数提供契约，业务逻辑放在别处

处理函数文件首先是 API 的声明：类型决定路由、文档和前端类型，JSDoc 决定描述，`examples`
提供文档页里的示例。运行时它只负责读取请求、调用业务函数、写出响应。

```ts
// backend/api-v1/src/api/post/article.ts
import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import { createArticle, type ArticleInput } from 'core/services'

type ApiType = AuthedHandler<{ body: ArticleInput }, { id: number }>

/** 创建一篇文章。 */
const handler: ApiType = async (req, res) => {
  res.send(createArticle(req.body))
}

export default authedApi(handler)
```

校验、数据库访问、事务这些真正的工作放在服务模块里，例如
`backend/core/src/services/article.ts`。处理函数保持薄，同一段逻辑可以被多个端点或
`api-v2` 复用，也更容易单独测试。

服务放在 `core` 时，需要给 `core/package.json` 增加一个 `./services` 导出；只在 `api-v1`
内部复用时，放在 `backend/api-v1/src/services/`，处理函数用相对路径导入即可。

不要在处理函数里展开业务实现。处理函数一厚，文档契约和业务细节就开始互相牵制，类型变更也会
波及实现。

## 两种处理函数

`core/handler` 导出两个类型：

```ts
import type { OpenHandler, AuthedHandler } from 'core/handler'
```

| 类型 | 含义 | 文件结尾 |
| --- | --- | --- |
| `OpenHandler<Payload, Response>` | 公开端点，不安装守卫 | `openApi(handler)` |
| `AuthedHandler<Payload, Response>` | 需要 `Authorization` 头，链首安装守卫 | `authedApi(handler)` |

两者的第一个泛型参数描述请求载荷，第二个描述响应：

```ts
interface LoginPayload {
  account: string
  password: string
}

type ApiType = OpenHandler<{ body: LoginPayload }, { token: string }>

const handler: ApiType = async (req, res) => {
  const { body } = req
  res.send({ token: 'JWT token' })
}

export default openApi(handler)
```

载荷的字段都是可选的，按端点实际使用的部分声明：

```ts
OpenHandler<
  {
    body?: unknown
    params?: unknown
    query?: unknown
    headers?: unknown
  },
  Response
>
```

`AuthedHandler` 会自动把 `Authorization: string` 加进 `headers`，并给 express/koa 的
`res.locals` 加上 `userId`。不需要在载荷里重复声明。

## 声明载荷用 `interface`

```ts
interface ArticlePayload {
  /** 这条 JSDoc 会出现在文档里 */
  title: string
  content: string
}
```

- 用 `interface`，不要用内联对象类型。文档生成器读取声明的名字；内联类型会被直接展开进文档，
  失去复用和引用。
- `/** ... */` 注释会进入 API 文档；`// ...` 单行注释被忽略。
- 属性上的 JSDoc 同样会保留，用来描述字段。

## 导出 `examples`

处理函数文件还可以导出 `examples`，为文档页提供请求示例。它和 `export default` 并列，
不是处理函数的属性：

```ts
import type { AuthedHandler, MakeExamplesType } from 'core/handler'
import { authedApi } from 'core/access'
import { createOrder } from 'core/services'

interface CheckoutPayload {
  items: { productId: number; quantity: number }[]
}

type ApiType = AuthedHandler<{ body: CheckoutPayload }, { id: number }>

const handler: ApiType = async (req, res) => {
  res.send(createOrder(req.body))
}

export default authedApi(handler)

export const examples: MakeExamplesType<ApiType> = {
  body: [
    {
      key: 'single',
      summary: 'One bag of beans',
      value: { items: [{ productId: 1, quantity: 1 }] },
    },
    {
      key: 'bundle',
      summary: 'Two bags and one accessory',
      value: {
        items: [
          { productId: 2, quantity: 2 },
          { productId: 9, quantity: 1 },
        ],
      },
    },
  ],
}
```

- 数组的每一项是 `{ key, summary, value }`：`key` 是文档页里的示例标签，`summary` 用来说明
  场景，`value` 是展示和调试时填入的值。
- 按 `body`、`query`、`params`、`headers`、`response` 分组；端点没有示例的部分可以不写。
- `MakeExamplesType<ApiType>` 用同一份载荷和响应类型检查示例值，字段写错会在编译时报错。
- 修改后运行一次 `gdoc`。示例会写进 `docs/api.json`，文档页在对应标签下显示。

## 框架里的签名

`alias.d.ts` 把通用形状绑定到各自框架：

| 框架 | 处理函数签名 |
| --- | --- |
| Express | `(req, res, next) => unknown` |
| Fastify | `(request, reply) => unknown` |
| Koa | `(ctx, next) => Promise<unknown>` |

注解只写一次，框架差异由 `core/types/alias.d.ts` 吸收。不要在处理函数里重新声明
`Request` / `Response`，那会绕开投影。

## 中间件链

`openApi` 与 `authedApi` 都接受可变参数，最后一个元素必须是处理函数：

```ts
const withAudit: MyMiddleware = async (req, res, next) => {
  // ...
  next()
}

export default authedApi(withAudit, handler)
// 实际注册：[verifyToken, withAudit, handler]
```

元组形状是有意的：类型投影从最后一个元素读取载荷和响应。不要把它标注成
`CustomHandlerType[]`——数组会丢掉元组，响应会退化成 `never`。

## 响应元数据

响应可以有状态码、响应头和说明。这些包装类型来自 `tealina/utility-types`（生成项目已经安装了
`tealina`，不必再装 `@tealina/utility-types`）：

```ts
import type {
  WithStatusCode,
  WithStatusCodeOnly,
  WithHeaders,
} from 'tealina/utility-types'

type Created = WithStatusCode<201, { id: number }>
type NoContent = WithStatusCodeOnly<204>
type WithPagination = WithHeaders<
  { 'x-total-count': number },
  { items: string[] }
>
```

客户端投影只保留响应体：`WithStatusCode<201, T>` 的调用结果仍是 `T`；非 2xx 的状态码投影为
`never`，因为成功路径上不会出现它。API 文档保留状态码与响应头。

`WithExtra` 是底层包装，通常不直接写。`ExtractResponse` / `Extract2xxResponse` 是投影用的读取器，
客户端包会用它们。

## 多目标载荷

同一端点有时需要三个不同的形状：服务端收到的、客户端发送的、文档展示的。用 `MultiTarget`：

```ts
import type { MultiTarget } from 'tealina/utility-types'

type StreamResponse = MultiTarget<{
  server: AsyncGenerator<{ type: string; content: string }>
  client: AsyncGenerator<{ type: string; content: string }>
  doc: { headers: { 'Content-Type': 'application/ndjson' } }
}>
```

`MultiTarget` 必须位于载荷或响应声明的最外层，嵌套在其他类型里不受支持。

## 投影

`types/api.d.ts` 把路由树投影成两种记录：

- `ApiTypesForDoc`：`gdoc` 读取它生成 `docs/api.json`。它**必须是文件里的第一个导出**。
- `ApiTypesForClient`：前端通过 `api-v1/api` 导入它，得到每个端点的请求载荷与响应类型。

```ts
// types/api.d.ts（由 align 生成或维护）
export type ApiTypesForDoc = { ... }
export type ApiTypesForClient = { ... }
```

这两个名字和顺序都是固定约定，见 [API 文档](./api-doc.md) 与 [前端客户端](./frontend.md)。

## 相关

- [鉴权](./authentication.md)：`openApi` / `authedApi` 的运行时行为与类型检查边界。
- [JavaScript 处理函数](./javascript-handlers.md)：同一契约在 `.js` 文件里的 JSDoc 写法。

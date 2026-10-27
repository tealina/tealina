# @tealina/client

从服务端处理函数类型生成类型安全的 API 客户端。API 只有一份描述——服务端的
`ApiTypesForClient`——路径、载荷和响应都由它推导，所以改掉一个字段会让前端编译失败。

包同时提供 `fetch` 与 Axios 适配，每种再分两种调用风格：

| 风格 | `fetch` | Axios | 调用形状 |
| --- | --- | --- | --- |
| 传统 | `createFetchClient` | `createAxiosReq` | `req.get('user', payload?, config?)` |
| RPC | `createFetchRPC` | `createAxiosRPC` | `rpc.get.user()` |

只有当端点声明了载荷时才会出现载荷参数；只有响应类型的端点，第二个参数直接就是可选的 config。

```bash
npm install @tealina/client
```

## API 记录

客户端把记录类型作为第一个类型参数。从 `tealina align` 生成的 API 包里取：

```ts
import type { ApiTypesForClient } from 'api-v1/api'
```

手写时，记录按 HTTP 方法分层，每个逻辑路径一项：

```ts
type ApiTypesForClient = {
  get: {
    health: { response: { isOk: boolean } }
    'user/:id': {
      params: { id: string }
      response: { id: string; name: string }
    }
  }
  post: {
    article: {
      body: { title: string }
      response: { id: number }
    }
  }
}
```

键是**逻辑路径**，不带前导斜杠。`params`、`query`、`body` 描述请求载荷；`response` 描述 Promise
解析出的值。`headers` 属于第二个参数（config），不在载荷里。

## fetch

### 传统风格

```ts
import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'api-v1/api'

const req = createFetchClient<ApiTypesForClient, RequestInit>(
  async (url, config) => {
    const response = await fetch(`/api/v1${url}`, config)
    return response.json()
  },
)

const health = await req.get('health') // { isOk: boolean }

const user = await req.get('user/:id', {
  params: { id: 'u1' },
})

const created = await req.post('article', {
  body: { title: 'Hello' },
})
```

### RPC 风格

RPC 调用按路径段嵌套，所以 `'user/:id/update'` 是 `rpc.post.user[':id'].update(...)`。不含斜杠的
路径保持扁平。

```ts
import { createFetchRPC } from '@tealina/client'
import type { ApiTypesForClient } from 'api-v1/api'

const rpc = createFetchRPC<ApiTypesForClient, RequestInit>(
  async (url, config) => {
    const response = await fetch(`/api/v1${url}`, config)
    return response.json()
  },
)

const health = await rpc.get.health()
const user = await rpc.get.user[':id']({ params: { id: 'u1' } })
```

## Axios

自带 Axios 实例。Axios 不是这个包的运行时依赖。

### 传统风格

```ts
import axios, { type AxiosRequestConfig } from 'axios'
import { createAxiosReq } from '@tealina/client'
import type { ApiTypesForClient } from 'api-v1/api'

const instance = axios.create({ baseURL: '/api/v1' })

export const req = createAxiosReq<ApiTypesForClient, AxiosRequestConfig>(config =>
  instance.request(config).then(response => response.data),
)

const user = await req.get('user/:id', { params: { id: 'u1' } })
```

### RPC 风格

```ts
import { createAxiosRPC } from '@tealina/client'

const rpc = createAxiosRPC<ApiTypesForClient, AxiosRequestConfig>(config =>
  instance.request(config).then(response => response.data),
)

const user = await rpc.get.user[':id']({ params: { id: 'u1' } })
```

### 原始 Axios 响应

`createAxiosReq` 和 `createAxiosRPC` 会解包 `response.data`。需要完整 Axios 响应（状态、头、
`data`）时，使用 `./axios` 子路径里的原始版本。返回值类型是你的 `AxiosResponse`，其中 `data`
收窄到该端点的响应类型：

```ts
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { createRawAxiosRPC } from '@tealina/client/axios'

const rpc = createRawAxiosRPC<ApiTypesForClient, AxiosRequestConfig, AxiosResponse>(
  config => axios.request(config),
)

const response = await rpc.get.health()
response.data.isOk // boolean
```

传统风格对应 `createRawAxiosReq`。

## 一次调用如何编码

两种风格共用同一个 context 构造器：

| 载荷字段 | 效果 |
| --- | --- |
| `params` | 替换路径里的 `:name` 段；长名字优先 |
| `query` | 用 `URLSearchParams` 追加 |
| `body` | fetch 适配器 JSON 序列化，Axios 适配器作为 `data` 发送 |

无论记录里怎么写，请求函数收到的总是以 `/` 开头的绝对 URL。基地址在请求函数里拼接，如上面
的例子。

fetch 适配器不会设置 `Content-Type: application/json`；在请求函数或本次调用的配置里自行
添加。端点声明的 headers 会进入 config 参数的类型：

```ts
type Api = {
  get: {
    me: { headers: { authorization: string }; response: { name: string } }
  }
}

req.get('me', { headers: { authorization: `Bearer ${token}` } })
```

## 响应投影

普通 `response` 类型就是 Promise 解析出的值。用 `WithStatusCode` 或 `WithHeaders` 包装后，投影到
响应体；非 2xx 的包装投影为 `never`：

```ts
import type { WithStatusCode } from '@tealina/utility-types'

type Api = {
  post: {
    article: {
      body: { title: string }
      response: WithStatusCode<201, { id: number }>
    }
  }
}

const created = await req.post('article', { body: { title: 'Hello' } })
// { id: number }
```

## JavaScript 调用方

类型参数是命名 API 记录的常规方式。JavaScript 没有类型参数，而未推断出的形状参数会退化为它的
约束，静默产生 `unknown` 响应和虚假的载荷参数。改为传入 `ShapeWitness`——它只作为类型读取，运行时
是 `undefined`：

```js
import { createFetchClient } from '@tealina/client'

export const req = createFetchClient(
  requester,
  /** @type {import('@tealina/client').ShapeWitness<import('api-v1/api').ApiTypesForClient>} */ (undefined),
)
```

对初始化表达式做断言是有意为之。`const` 会收窄到初始值，所以
`/** @type {...} */ const shape = undefined` 会丢掉注解——要断言初始值。

## 子路径

| 入口 | 导出 |
| --- | --- |
| `@tealina/client` | `createFetchClient`、`createFetchRPC`、`createAxiosReq`、`createAxiosRPC`、`ShapeWitness` |
| `@tealina/client/fetch` | `createFetchClient`、`createFetchRPC` |
| `@tealina/client/axios` | `createAxiosReq`、`createAxiosRPC`、`createRawAxiosReq`、`createRawAxiosRPC` |
| `@tealina/client/core` | `createReq`、`createRPC`、`makeContext`、`ToReq`、`ToRPC`、`ClientRequestContext` |

core 里的工厂接受你自己写的请求函数，可以用它接入别的 HTTP 库或测试替身。它们接收的是
**投影后的调用形状**，不是原始 API 记录：传统风格用 `ToReq`，RPC 风格用 `ToRPC`。fetch 和 Axios
工厂只是替你套上投影。

```ts
import { createReq, type ToReq } from '@tealina/client/core'

type Config = { signal?: AbortSignal }

const req = createReq<ToReq<MyApi, Config>, Config>((context, config) => {
  // context: { method, url, body?, raw? }
  return myHttpClient(context, config)
})
```

## 环境要求

包是 ESM，要求 Node ≥ 22。`fetch` 在那里是全局的；Axios 由调用方提供。

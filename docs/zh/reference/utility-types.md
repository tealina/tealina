# @tealina/utility-types

Tealina 服务端、客户端和文档层共用的条件类型工具箱。**只有类型**，导入它不会增加打包体积。

```bash
npm install @tealina/utility-types
```

```ts
import type {
  Extract2xxResponse,
  MultiTarget,
  PickTarget,
  Simplify,
  WithStatusCode,
} from '@tealina/utility-types'
```

这些类型也从 `tealina/utility-types` 再导出，所以已经安装 CLI 的生成项目不需要第二个包。

## 响应元数据

处理函数的响应类型可以携带状态码、响应头和注释。下面的包装器添加元数据，同时在需要响应体的地方
仍然投影到响应体。

| 类型 | 含义 |
| --- | --- |
| `WithExtra<T>` | `T` 加上响应标记 |
| `WithStatusCode<StatusCode, Response>` | 带显式状态码的响应 |
| `WithStatusCodeOnly<StatusCode, Description?>` | 只有状态码，没有响应体 |
| `WithHeaders<Headers, Response>` | 带类型化响应头的响应 |
| `ExtractResponse<T>` | 取 `response` 字段，否则取 `T` 本身 |
| `Extract2xxResponse<T>` | 状态为 2xx 时取响应体，否则为 `never` |

```ts
import type {
  Extract2xxResponse,
  ExtractResponse,
  WithStatusCode,
} from '@tealina/utility-types'

type Created = WithStatusCode<201, { id: number }>
type BadRequest = WithStatusCode<400, { message: string }>

type CreatedBody = ExtractResponse<Created> // { id: number }
type OkBody = Extract2xxResponse<Created> // { id: number }
type ErrorBody = Extract2xxResponse<BadRequest> // never
```

客户端就是用 `ExtractResponse` 和 `Extract2xxResponse` 把处理函数注解变成 Promise 解析出的值。没有
包装的普通响应类型原样返回。

## 形状辅助

| 类型 | 含义 |
| --- | --- |
| `EmptyObject` | 没有必填键的对象；`{}` 做不到这一点 |
| `Simplify<T>` | 压平交叉类型，让编辑器显示成一个对象 |
| `LastElement<T>` | 元组的最后一个元素；不是元组时返回 `T` |
| `MaybeProperty<P, T>` | `P` 为 `null` 时是 `{}`，否则是 `{ [K in T]: P }` |

```ts
import type { EmptyObject, Simplify } from '@tealina/utility-types'

type Base = { id: number }
type Extended = Simplify<Base & { name: string }> // { id: number; name: string }

declare function needsNoPayload(payload: EmptyObject): void
needsNoPayload({}) // ok
```

`EmptyObject` 用唯一符号而不是 `{}`，避免一个 `{}` 类型的值意外满足真实载荷槽位。

## 文档辅助

| 类型 | 含义 |
| --- | --- |
| `DocDataKeys` | `'body' \| 'response' \| 'query' \| 'params' \| 'headers'` |
| `ExampleItem<V>` | 具名示例：`{ key, summary, value }` |
| `RemapToExampleType<T>` | 允许每个载荷字段是值或示例列表 |

```ts
import type { RemapToExampleType } from '@tealina/utility-types'

type Examples = RemapToExampleType<{
  body: { title: string }
  query: { page: number }
}>
// {
//   body?: ExampleItem<{ title: string }>[] | { title: string }
//   query?: ExampleItem<{ page: number }>[] | { page: number }
// }
```

`@tealina/doc-types` 在它的 `DocItem` 类型里使用 `DocDataKeys` 和 `ExampleItem`，但不再导出它们；
编写文档工具时从这里导入。

## 多目标载荷

一个端点有时需要在三个消费者那里各有不同形状：服务端收到增强后的载荷，客户端发送公开载荷，文档
描述线上格式。

```ts
import type { MultiTarget, PickTarget } from '@tealina/utility-types'

type StreamResponse = MultiTarget<{
  server: AsyncGenerator<{ type: string; content: string }>
  client: AsyncGenerator<{ type: string; content: string }>
  doc: { headers: { 'Content-Type': 'application/ndjson' } }
}>

type DocSide = PickTarget<StreamResponse, 'doc'>
```

键由 `TargetKeys` 固定为 `'server' | 'client' | 'doc'`。对不是 `MultiTarget` 的类型，
`PickTarget` 原样返回 `T`。

`MultiTarget` 必须用在载荷或响应声明的顶层；嵌套在别的类型里不受支持。

## 约定

`WithExtra` 发出的响应标记在 `parseDeclarationFile.js` 里按名字匹配
（`__@ResponseFlagSymbol`）。重命名这个符号仍能编译，但 `tealina gdoc` 会静默地不再识别响应
元数据——保持声明原样。

# @tealina/doc-types

Tealina API 文档的数据模型：`tealina gdoc` 写出的形状，也是 `@tealina/doc-ui`（或你自己写的
工具）读取的形状。

文档是一棵扁平树。端点按 HTTP 方法分组；共享或递归的类型只在数字 id 表里存一次——
`entityRefs`、`enumRefs` 或 `tupleRefs`——所以树始终有限。

```bash
npm install @tealina/doc-types
```

装成生产依赖而不是开发依赖：`DocKind` 是运行时 `const` 对象，不只是类型。

## 文档形状

```ts
import type { ApiDoc } from '@tealina/doc-types'

interface ApiDoc {
  apis: Record<string, Record<string, DocItem>>
  entityRefs: Record<number, Entity>
  enumRefs: Record<number, EnumEntity>
  tupleRefs: Record<number, TupleEntity>
  /** 当前是 1.1。遵循 `[major].[minor]`。 */
  docTypeVersion: number
}
```

`DocItem` 描述一个端点。每个载荷字段都是可选的，因为处理函数可能只声明它用到的部分：

```ts
interface DocItem {
  body?: DocNode
  response?: DocNode
  query?: DocNode
  params?: DocNode
  headers?: DocNode
  comment?: string
  examples?: Record<'body' | 'response' | 'query' | 'params' | 'headers',
    ExampleItem<{}>[] | Record<string, unknown>>
}
```

示例：

```json
{
  "apis": {
    "get": {
      "health": {
        "response": { "kind": 4, "id": 268 }
      }
    }
  },
  "entityRefs": {
    "268": {
      "name": "{ status: string; }",
      "props": [{ "name": "status", "kind": 0, "type": "string" }]
    }
  },
  "enumRefs": {},
  "tupleRefs": {},
  "docTypeVersion": 1.1
}
```

上面是缩写；`gdoc` 总是写全五个顶层键。

## `DocKind`

`DocKind` 既是值也是类型。用 `switch` 语句判断 `node.kind`，会把 `DocNode` 收窄到对应接口。

| 值 | `DocKind` 成员 | 接口 | 额外字段 |
| --- | --- | --- | --- |
| 0 | `Primitive` | `PrimitiveType` | `type` |
| 1 | `NonLiteralObject` | `ObjectType` | `type` |
| 2 | `Tuple` | `TupleType` | `elements` |
| 3 | `Union` | `UnionType` | `types` |
| 4 | `EntityRef` | `RefType` | `id` |
| 5 | `Never` | `NeverType` | — |
| 6 | `Record` | `RecordType` | `key`、`value` |
| 7 | `StringLiteral` | `StringLiteral` | `value: string` |
| 8 | `NumberLiteral` | `NumberLiteral` | `value: number` |
| 9 | `EnumRef` | `EnumRefType` | `id` |
| 10 | `EnumMemberRef` | `EnumMemberRefType` | `enumId`、`memberId` |
| 11 | `Array` | `ArrayType` | `element` |
| 12 | `RecursionTuple` | `RecursionTuple` | `id` |
| 13 | `RecursionEntity` | `RecursionEntity` | `id` |
| 14 | `LiteralObject` | `LiteralEntity` | `props`，可选 `name` |
| 15 | `ResponseEntity` | `ResponseEntity` | `statusCode?`、`headers?`、`response?` |

所有节点都通过共享的 `Kind` 接口接受 `isOptional`、`comment` 和 `jsDoc`。`RecursionTuple` 与
`RecursionEntity` 指回已经在引用表里的元组或实体；它们让自引用类型不会无限展开。

## 渲染节点

```tsx
import { DocKind, type DocNode } from '@tealina/doc-types'

function render(node: DocNode) {
  switch (node.kind) {
    case DocKind.Primitive:
      return <code>{node.type}</code>
    case DocKind.Array:
      return <span>[{render(node.element)}]</span>
    case DocKind.EntityRef:
      return <a href={`#entity-${node.id}`}>object</a>
    case DocKind.Union:
      return (
        <span>
          {node.types.map((type, index) => (
            <span key={index}>
              {index > 0 ? ' | ' : null}
              {render(type)}
            </span>
          ))}
        </span>
      )
    default:
      return null
  }
}
```

## 引用表

| 类型 | 字段 |
| --- | --- |
| `Entity` | `name`、`props: PropType[]`，可选 `comment` |
| `EnumEntity` | `name`、`members: EnumMember[]`，可选 `comment` |
| `TupleEntity` | `name`、`elements: DocNode[]` |
| `PropType` | `{ name: string } & DocNode` |

实体的 `name` 是声明打印器产出的类型文本——常常是字面对象写法，例如 `{ status: string; }`，而不是
TypeScript 别名。`EntityRef` 和 `EnumRef` 通过对应表里的数字键解析。

## 约定

转换这份文档的包应带 `tealina-doc` 前缀，读者才能看出它扩展的是格式的哪一侧。

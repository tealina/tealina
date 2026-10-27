# @tealina/doc-types

The data model for Tealina API documentation: the shape `tealina gdoc` writes, and the shape
`@tealina/doc-ui` (or tooling you write yourself) reads.

Documentation is a flat tree. Endpoints are grouped by HTTP method; shared or recursive types are
stored once in numeric id tables — `entityRefs`, `enumRefs` or `tupleRefs` — so the tree always stays
finite.

```bash
npm install @tealina/doc-types
```

Install it as a production dependency rather than a dev dependency: `DocKind` is a runtime `const`
object, not just a type.

## Document Shape

```ts
import type { ApiDoc } from '@tealina/doc-types'

interface ApiDoc {
  apis: Record<string, Record<string, DocItem>>
  entityRefs: Record<number, Entity>
  enumRefs: Record<number, EnumEntity>
  tupleRefs: Record<number, TupleEntity>
  /** Currently 1.1. Follows `[major].[minor]`. */
  docTypeVersion: number
}
```

`DocItem` describes an endpoint. Every payload field is optional, because a handler may declare only
the parts it uses:

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

Example:

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

The above is abbreviated; `gdoc` always writes all five top-level keys.

## `DocKind`

`DocKind` is both a value and a type. Switching on `node.kind` with a `switch` statement narrows
`DocNode` to the matching interface.

| Value | `DocKind` member | Interface | Extra fields |
| --- | --- | --- | --- |
| 0 | `Primitive` | `PrimitiveType` | `type` |
| 1 | `NonLiteralObject` | `ObjectType` | `type` |
| 2 | `Tuple` | `TupleType` | `elements` |
| 3 | `Union` | `UnionType` | `types` |
| 4 | `EntityRef` | `RefType` | `id` |
| 5 | `Never` | `NeverType` | — |
| 6 | `Record` | `RecordType` | `key`, `value` |
| 7 | `StringLiteral` | `StringLiteral` | `value: string` |
| 8 | `NumberLiteral` | `NumberLiteral` | `value: number` |
| 9 | `EnumRef` | `EnumRefType` | `id` |
| 10 | `EnumMemberRef` | `EnumMemberRefType` | `enumId`, `memberId` |
| 11 | `Array` | `ArrayType` | `element` |
| 12 | `RecursionTuple` | `RecursionTuple` | `id` |
| 13 | `RecursionEntity` | `RecursionEntity` | `id` |
| 14 | `LiteralObject` | `LiteralEntity` | `props`, optional `name` |
| 15 | `ResponseEntity` | `ResponseEntity` | `statusCode?`, `headers?`, `response?` |

All nodes accept `isOptional`, `comment` and `jsDoc` through the shared `Kind` interface.
`RecursionTuple` and `RecursionEntity` point back to a tuple or entity already in the reference
tables; they keep self-referential types from expanding forever.

## Rendering Nodes

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

## Reference Tables

| Type | Fields |
| --- | --- |
| `Entity` | `name`, `props: PropType[]`, optional `comment` |
| `EnumEntity` | `name`, `members: EnumMember[]`, optional `comment` |
| `TupleEntity` | `name`, `elements: DocNode[]` |
| `PropType` | `{ name: string } & DocNode` |

An entity's `name` is the type text produced by the declaration printer — often a literal object form
such as `{ status: string; }` rather than a TypeScript alias. `EntityRef` and `EnumRef` resolve
through the numeric keys in the corresponding table.

## Conventions

A package that transforms this document should carry the `tealina-doc` prefix, so readers can tell
which side of the format it extends.

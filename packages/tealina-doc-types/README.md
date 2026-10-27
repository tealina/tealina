# @tealina/doc-types

The data model of a tealina API document: the shape `tealina gdoc` writes, and the shape
`@tealina/doc-ui` (or any tool you write) reads.

The document is a flat tree. Endpoints live under their HTTP method, and shared or
recursive types are stored once in a numeric-id table — `entityRefs`, `enumRefs` or
`tupleRefs` — so the tree stays finite.

```bash
npm install @tealina/doc-types
```

Install it as a dependency rather than a devDependency: `DocKind` is a runtime `const`
object, not only a type.

## Document shape

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

A `DocItem` describes one endpoint. Every payload field is optional, because a handler
may declare only the parts it uses:

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

`example.json`:

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

The example above is abbreviated; `gdoc` always writes all four top-level keys.

## `DocKind`

`DocKind` is both a value and a type. Switching on `node.kind` narrows `DocNode` to the
matching interface.

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

All node kinds also accept `isOptional`, `comment` and `jsDoc` through the shared `Kind`
interface. `RecursionTuple` and `RecursionEntity` point back at a tuple or entity already
in the ref tables; they are what keeps a self-referencing type from expanding forever.

## Rendering a node

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

## Ref tables

| Type | Fields |
| --- | --- |
| `Entity` | `name`, `props: PropType[]`, optional `comment` |
| `EnumEntity` | `name`, `members: EnumMember[]`, optional `comment` |
| `TupleEntity` | `name`, `elements: DocNode[]` |
| `PropType` | `{ name: string } & DocNode` |

An entity's `name` is the type text the declaration printer produced — often the literal
object spelling, such as `{ status: string; }`, not a TypeScript alias. `EntityRef` and
`EnumRef` resolve through the numeric key in the matching table.

## Convention

Packages that transform this document should be named with the `tealina-doc` prefix, so a
reader can tell which side of the format they extend.

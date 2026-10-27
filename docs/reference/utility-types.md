# @tealina/utility-types

A toolbox of conditional types shared by Tealina's server, client and documentation layers. **Types
only** — importing it adds nothing to your bundle.

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

These types are also re-exported from `tealina/utility-types`, so a generated project that already
has the CLI installed needs no second package.

## Response Metadata

A handler's response type can carry a status code, response headers and comments. The wrappers below
add metadata while still projecting to the response body wherever a body is expected.

| Type | Meaning |
| --- | --- |
| `WithExtra<T>` | `T` plus response markers |
| `WithStatusCode<StatusCode, Response>` | A response with an explicit status code |
| `WithStatusCodeOnly<StatusCode, Description?>` | A status code only, no response body |
| `WithHeaders<Headers, Response>` | A response with typed response headers |
| `ExtractResponse<T>` | Takes the `response` field, otherwise `T` itself |
| `Extract2xxResponse<T>` | The response body when the status is 2xx, otherwise `never` |

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

The client uses `ExtractResponse` and `Extract2xxResponse` to turn handler annotations into the value
a Promise resolves to. A plain response type with no wrapper is returned as is.

## Shape Helpers

| Type | Meaning |
| --- | --- |
| `EmptyObject` | An object with no required keys; `{}` cannot do this |
| `Simplify<T>` | Flattens intersections so editors show a single object |
| `LastElement<T>` | The last element of a tuple; `T` when it is not a tuple |
| `MaybeProperty<P, T>` | `{}` when `P` is `null`, otherwise `{ [K in T]: P }` |

```ts
import type { EmptyObject, Simplify } from '@tealina/utility-types'

type Base = { id: number }
type Extended = Simplify<Base & { name: string }> // { id: number; name: string }

declare function needsNoPayload(payload: EmptyObject): void
needsNoPayload({}) // ok
```

`EmptyObject` uses a unique symbol rather than `{}`, preventing a value of type `{}` from
accidentally satisfying a real payload slot.

## Document Helpers

| Type | Meaning |
| --- | --- |
| `DocDataKeys` | `'body' \| 'response' \| 'query' \| 'params' \| 'headers'` |
| `ExampleItem<V>` | A named example: `{ key, summary, value }` |
| `RemapToExampleType<T>` | Lets each payload field be a value or a list of examples |

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

`@tealina/doc-types` uses `DocDataKeys` and `ExampleItem` in its `DocItem` type but no longer
exports them; import them from here when writing documentation tooling.

## Multiple-target Payloads

An endpoint sometimes needs a different shape at each of three consumers: the server receives an
enriched payload, the client sends the public payload, and the documentation describes the wire
format.

```ts
import type { MultiTarget, PickTarget } from '@tealina/utility-types'

type StreamResponse = MultiTarget<{
  server: AsyncGenerator<{ type: string; content: string }>
  client: AsyncGenerator<{ type: string; content: string }>
  doc: { headers: { 'Content-Type': 'application/ndjson' } }
}>

type DocSide = PickTarget<StreamResponse, 'doc'>
```

The keys are fixed by `TargetKeys` to `'server' | 'client' | 'doc'`. For a type that is not a
`MultiTarget`, `PickTarget` returns `T` as is.

`MultiTarget` must be used at the top level of a payload or response declaration; nesting it inside
another type is not supported.

## Conventions

The response marker emitted by `WithExtra` is matched by name in `parseDeclarationFile.js`
(`__@ResponseFlagSymbol`). Renaming this symbol still compiles, but `tealina gdoc` silently stops
recognizing response metadata — keep the declaration as is.

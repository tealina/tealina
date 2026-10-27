# @tealina/utility-types

The conditional-type toolbox used by tealina's server, client and documentation layers.
It contains **types only** — importing it adds nothing to your bundle.

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

The same types are re-exported from `tealina/utility-types`, so a generated project that
already installs the CLI does not need a second package.

## Response metadata

A handler's response type can carry a status code, headers and a comment. The wrappers
below add that metadata while still projecting to the response body where a body is
expected.

| Type | Meaning |
| --- | --- |
| `WithExtra<T>` | `T` plus the response marker |
| `WithStatusCode<StatusCode, Response>` | A response with an explicit status code |
| `WithStatusCodeOnly<StatusCode, Description?>` | A status code with no body |
| `WithHeaders<Headers, Response>` | A response with typed headers |
| `ExtractResponse<T>` | The `response` field, or `T` itself |
| `Extract2xxResponse<T>` | The body when the status is 2xx; `never` otherwise |

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

`ExtractResponse` and `Extract2xxResponse` are how the client turns a handler annotation
into the value its promise resolves to. A plain response type — one with no wrapper — is
returned unchanged.

## Shape helpers

| Type | Meaning |
| --- | --- |
| `EmptyObject` | An object with no required keys; `{}` does not work for this |
| `Simplify<T>` | Flatten an intersection so editors show one object |
| `LastElement<T>` | The last element of a tuple, or `T` when it is not a tuple |
| `MaybeProperty<P, T>` | `{}` when `P` is `null`, otherwise `{ [K in T]: P }` |

```ts
import type { EmptyObject, Simplify } from '@tealina/utility-types'

type Base = { id: number }
type Extended = Simplify<Base & { name: string }> // { id: number; name: string }

declare function needsNoPayload(payload: EmptyObject): void
needsNoPayload({}) // ok
```

`EmptyObject` uses a unique symbol rather than `{}` so an `{}`-typed value cannot satisfy
a real payload slot by accident.

## Documentation helpers

| Type | Meaning |
| --- | --- |
| `DocDataKeys` | `'body' \| 'response' \| 'query' \| 'params' \| 'headers'` |
| `ExampleItem<V>` | A named example: `{ key, summary, value }` |
| `RemapToExampleType<T>` | Allows each payload field to be a value or a list of examples |

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

`@tealina/doc-types` uses `DocDataKeys` and `ExampleItem` in its `DocItem` type. They are
not re-exported from that package; import them from here when you write a documentation
tool.

## Multi-target payloads

One endpoint sometimes needs a different shape in each of its three consumers: the
server receives an enriched payload, the client sends the public one, and the document
describes the wire format.

```ts
import type { MultiTarget, PickTarget } from '@tealina/utility-types'

type IdInQuery = { query: { id: number } }

type StreamResponse = MultiTarget<{
  server: AsyncGenerator<{ type: string; content: string }>
  client: AsyncGenerator<{ type: string; content: string }>
  doc: { headers: { 'Content-Type': 'application/ndjson' } }
}>

type DocSide = PickTarget<StreamResponse, 'doc'>
```

The keys are fixed by `TargetKeys` — `'server' | 'client' | 'doc'`. `PickTarget` returns
`T` unchanged for a type that is not a `MultiTarget`.

`MultiTarget` must be used at the top level of a payload or response declaration. Nesting
it inside another type is not supported.

## Convention

The response marker emitted by `WithExtra` is matched by name in
`parseDeclarationFile.js` (`__@ResponseFlagSymbol`). Renaming that symbol would still
compile, and `tealina gdoc` would silently stop recognizing response metadata — keep the
declaration as it is.

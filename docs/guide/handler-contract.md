# Handler Contract

A handler's type annotation is the shared source of truth for routing, API docs and frontend client types. If the annotation is wrong, all three are wrong; when the annotation changes, all three change with it.

## Handlers Provide the Contract, Business Logic Lives Elsewhere

A handler file is first and foremost a declaration of the API: its types determine routing, docs and frontend types, its JSDoc determines descriptions, and `examples` supplies the samples on the docs page. At runtime it only reads the request, calls the business function and writes the response.

```ts
// backend/api-v1/src/api/post/article.ts
import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import { createArticle, type ArticleInput } from 'core/services'

type ApiType = AuthedHandler<{ body: ArticleInput }, { id: number }>

/** Create an article. */
const handler: ApiType = async (req, res) => {
  res.send(createArticle(req.body))
}

export default authedApi(handler)
```

The real work — validation, database access, transactions — belongs in service modules, for example `backend/core/src/services/article.ts`. Keep handlers thin: the same logic can be reused by several endpoints or by `api-v2`, and it is easier to test on its own.

When the service lives in `core`, add a `./services` export to `core/package.json`. When it is reused only inside `api-v1`, put it in `backend/api-v1/src/services/` and import it from the handler with a relative path.

Do not expand the business implementation inside the handler. Once a handler grows thick, the documented contract and the business details start to constrain each other, and type changes ripple into the implementation.

## Two Kinds of Handlers

`core/handler` exports two types:

```ts
import type { OpenHandler, AuthedHandler } from 'core/handler'
```

| Type | Meaning | End of file |
| --- | --- | --- |
| `OpenHandler<Payload, Response>` | Public endpoint, no guard installed | `openApi(handler)` |
| `AuthedHandler<Payload, Response>` | Requires the `Authorization` header, guard installed at the head of the chain | `authedApi(handler)` |

The first generic parameter of each describes the request payload, the second describes the response:

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

Payload fields are all optional; declare only the parts the endpoint actually uses:

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

`AuthedHandler` automatically adds `Authorization: string` to `headers` and `userId` to `res.locals` for Express/Koa. There is no need to declare them again in the payload.

## Declare Payloads with `interface`

```ts
interface ArticlePayload {
  /** This JSDoc appears in the docs */
  title: string
  content: string
}
```

- Use `interface`, not an inline object type. The docs generator reads the declared name; an inline type is expanded directly into the docs and loses reuse and references.
- `/** ... */` comments go into the API docs; `// ...` single-line comments are ignored.
- JSDoc on properties is preserved as well, and is used to describe the field.

## Exporting `examples`

A handler file can also export `examples` to supply request samples for the docs page. It sits alongside `export default` and is not a property of the handler:

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

- Each array item is `{ key, summary, value }`: `key` is the sample label on the docs page, `summary` explains the scenario, and `value` is the value filled in for display and debugging.
- Group by `body`, `query`, `params`, `headers` and `response`; a part the endpoint has no samples for can be omitted.
- `MakeExamplesType<ApiType>` type-checks the sample values against the same payload and response types, so a wrong field is a compile-time error.
- Run `gdoc` once after changing them. The samples are written to `docs/api.json`, and the docs page shows them under the matching label.

## Signatures by Framework

`alias.d.ts` binds the generic shape to each framework:

| Framework | Handler signature |
| --- | --- |
| Express | `(req, res, next) => unknown` |
| Fastify | `(request, reply) => unknown` |
| Koa | `(ctx, next) => Promise<unknown>` |

Write the annotation once; `core/types/alias.d.ts` absorbs the framework differences. Do not re-declare `Request` / `Response` inside the handler — that bypasses the projection.

## Middleware Chain

`openApi` and `authedApi` both take variadic arguments, and the last element must be the handler:

```ts
const withAudit: MyMiddleware = async (req, res, next) => {
  // ...
  next()
}

export default authedApi(withAudit, handler)
// Actual registration: [verifyToken, withAudit, handler]
```

The tuple shape is deliberate: type projection reads the payload and response from the last element. Do not annotate it as `CustomHandlerType[]` — an array loses the tuple and the response degrades to `never`.

## Response Metadata

A response can carry a status code, response headers and a description. These wrapper types come from `tealina/utility-types` (generated projects already install `tealina`; there is no need to install `@tealina/utility-types` as well):

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

The client projection keeps only the response body: the call result of `WithStatusCode<201, T>` is still `T`; a non-2xx status code projects to `never`, because it cannot appear on the success path. The API docs keep the status code and response headers.

`WithExtra` is the underlying wrapper and is usually not written directly. `ExtractResponse` / `Extract2xxResponse` are the readers used for projection; the client package uses them.

## Multi-Target Payloads

Sometimes the same endpoint needs three different shapes: what the server receives, what the client sends and what the docs display. Use `MultiTarget`:

```ts
import type { MultiTarget } from 'tealina/utility-types'

type StreamResponse = MultiTarget<{
  server: AsyncGenerator<{ type: string; content: string }>
  client: AsyncGenerator<{ type: string; content: string }>
  doc: { headers: { 'Content-Type': 'application/ndjson' } }
}>
```

`MultiTarget` must sit at the outermost level of the payload or response declaration; nesting it inside other types is not supported.

## Projection

`types/api.d.ts` projects the route tree into two records:

- `ApiTypesForDoc`: `gdoc` reads it to generate `docs/api.json`. It **must be the first export in the file**.
- `ApiTypesForClient`: the frontend imports it through `api-v1/api` and gets the request payload and response type for every endpoint.

```ts
// types/api.d.ts (generated or maintained by align)
export type ApiTypesForDoc = { ... }
export type ApiTypesForClient = { ... }
```

Both names and their order are fixed conventions; see [API Docs](./api-doc.md) and [Frontend Client](./frontend.md).

## Related

- [Authentication](./authentication.md): the runtime behavior of `openApi` / `authedApi` and the type-checking boundaries.
- [JavaScript Handlers](./javascript-handlers.md): the same contract written with JSDoc in `.js` files.

# Authentication

**Every endpoint requires the `Authorization` header by default.** Whether an endpoint is public is decided by the end of its own file, not by a path table in the router.

```ts
// src/api/get/health.ts — public
export default openApi(handler)

// src/api/post/article.ts — requires Authorization
export default authedApi(handler)
```

`authedApi` is not a marker the router recognizes: at runtime it puts `verifyToken` at the head of the middleware chain, and the guard is registered along with the other middleware. A new endpoint stays private until you explicitly say it is public.

## Authentication Has Three Parts

`openApi` and `authedApi` are the generic implementations that ship with the scaffold, and also the smallest reference implementation to build custom authentication from. What actually wires authentication into routing is these three parts:

| Part | Location | Role |
| --- | --- | --- |
| `headers` | Handler type | Describes request headers. `gdoc` writes them into the API docs, and the frontend gets header types from the same type |
| `locals` | Handler type, guard | Declares the framework context the handler can read: Express's `res.locals`, Koa's `ctx.state`, Fastify's `request.locals` |
| Guard | `authedApi` | Placed at the head of the middleware chain at runtime; it validates credentials and writes the result into `locals` |

`backend/core/types/common.d.ts` defines the default shapes:

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

`AuthedHandler` carries `AuthHeaders & JsonHeaders` and `AuthedLocals` in addition to the payload; `OpenHandler` carries only `JsonHeaders`. Therefore:

- Fields written by the guard must appear in `AuthedLocals` for the handler to read them directly.
- Header shapes are written once: the API docs and frontend types are both derived from the handler type.
- Types do not govern runtime. The only difference between `openApi` and `authedApi` is whether the guard is placed in the chain.

## What the Default Guard Does

`verifyToken` lives in `backend/core/src/access/verifyToken.ts`:

- When the `Authorization` header is missing it returns `401` directly, with the body:

  ```json
  { "code": "Unauthorized", "message": "Authorization header is missing." }
  ```

- When the header is present, it writes the user context and continues:
  - Express: `res.locals.userId`
  - Koa: `ctx.state.userId`
  - Fastify: `request.locals.userId`

The scaffold's guard only checks that the header exists and sets `userId` to a placeholder. Replace the `TODO` with real token validation.

## Verification

```bash
curl -i -X POST localhost:8000/api/v1/article
# 401

curl -i -X POST localhost:8000/api/v1/article \
  -H 'Authorization: anything'
# 200
```

The login endpoint is public; the frontend calls it first to get a token, then hands the token to the client:

```ts
import { req, setToken } from './api/client'

const { token } = await req.post('login', {
  body: { account, password },
})
setToken(token)

await req.post('article', { body: { title: 'hello', content: '...' } })
```

## Type-checking Boundaries

The two default call names also correspond to two handler types: an `openApi` chain is declared as `OpenHandler`, an `authedApi` chain as `AuthedHandler`. On Express and Koa this pairing is checked:

- `openApi(anAuthedHandler)` does not compile: a handler that reads `res.locals.userId` cannot be placed on a public route.

Two measured gaps remain:

- `authedApi(anOpenHandler)` compiles on every framework, and still installs the guard. The route is stricter than the type declaration says — a deviation in the safe direction.
- Fastify checks neither. `FastifyRequest` gains `locals` through module augmentation, and both handler types resolve to the same request type, so both calls accept the same set.

## Custom Authentication

### Replacing the Default Implementation

If the whole project needs only one kind of authentication, just change the three default places:

1. `AuthHeaders` and `AuthedLocals` in `backend/core/types/common.d.ts`
2. the validation and context writes in `backend/core/src/access/verifyToken.ts`
3. when needed, the `401` response body

For example, switching to an API key (Express shown below):

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

Existing `authedApi(handler)` and `AuthedHandler` call sites do not need to change: the `headers` and `locals` in the handler type change along with `common.d.ts`, and the API docs and frontend types follow.

### Adding a Second `AuthByKeyApi`

When two kinds of authentication need to coexist, do not change the default definitions; write another guard and wrapper function. Its structure matches `authedApi`: **the type declares the request headers and context, and the wrapper puts the guard at the head of the chain.**

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

// Reuse OpenHandler: it carries no Authorization, only JsonHeaders and the key header declared here.
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

// Payload fields are typed as any: the constraint must not narrow the body the handler declares itself.
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
  // Unshift in place like authedApi: the handler must stay last, and the docs generator reads the type from the last position.
  handlers.unshift(verifyKey)
  return handlers
}
```

Then export it from `backend/core/src/access/index.ts`, and the project can use it through `core/access`:

```ts
export { AuthByKeyApi, verifyKey } from './authByKey.js'
export type {
  ApiKeyHandler,
  ApiKeyHeaders,
  ApiKeyLocals,
} from './authByKey.js'
```

Declaring a handler as `ApiKeyHandler` gives it typed request headers and context directly:

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

`ApiKeyHandler` is a concrete alias of `OpenHandler`: it describes only the request headers and context of this authentication scheme, and the name makes call sites clearer. What actually installs the guard is `AuthByKeyApi`, and `AnyKeyPayload` makes the wrapper accept only handlers that declare `x-api-key`.

On Express and Koa, neither the default `openApi` nor `authedApi` accepts an `ApiKeyHandler`: their constraints do not declare `x-api-key`, and `ApiKeyHandler` requires it. So a handler that needs an API key cannot be mistakenly attached to a public route, and `verifyKey` cannot be forgotten.

The reverse is allowed: `AuthByKeyApi(anOpenHandler)` compiles, because a handler that only reads ordinary request headers is safe to place in a chain that requires more headers. This is the same direction of deviation as `authedApi(anOpenHandler)`. Fastify's types do not check request headers in the first place, so the default wrappers and `AuthByKeyApi` accept the same set of handlers.

### Other Frameworks

The examples above use Express. For Koa or Fastify, change the guard's signature and its context location:

| Framework | Guard type | Context |
| --- | --- | --- |
| Express | `RequestHandler` | `res.locals` |
| Koa | `Middleware` | `ctx.state` |
| Fastify | `preHandlerAsyncHookHandler` | `request.locals` |

The wrapper function's final constraint must use the `OpenHandler` for that framework. Fastify's guard also needs `res.status(...).json(...)` replaced with `reply.code(...).send(...)`. In addition, Fastify fixes `request.locals` to `AuthedLocals` through `backend/core/types/fastify.d.ts`; when adding another `locals` shape, update that module augmentation as well, or a guard that writes the new field will fail type-checking.

## Related

- [Handler Contract](./handler-contract.md)
- [Frontend Client](./frontend.md)

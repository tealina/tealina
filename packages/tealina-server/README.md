# @tealina/server

The runtime half of tealina's file-based routing. It resolves the lazy `import()` barrels
that `tealina align` writes and flattens them into the route list a framework can
register.

It has **zero dependencies** and exactly two exports:

| Export | Purpose |
| --- | --- |
| `loadAPIs` | Await the two-level lazy import tree and return plain handlers |
| `transformToRouteOptions` | Flatten it into `{ method, url, handler }` entries |

```bash
npm install @tealina/server
```

Requires Node ≥ 22.

## The barrel it reads

`align` writes one barrel per method directory and one at the API root:

```ts
// api/get/index.ts
export default {
  health: import('./health.js'),
  'user/:id': import('./user/[id].js'),
}

// api/index.ts
export default {
  get: import('./get/index.js'),
  post: import('./post/index.js'),
}
```

Each level is a `Promise` of a module whose `default` is described by the level below.
`loadAPIs` awaits both levels and returns:

```ts
Record<method, Record<path, handler>>
```

The path keys stay logical — `'health'`, `'user/:id'` — without a leading slash.

## Registering routes

### Express

```ts
import { Router } from 'express'
import type { RequestHandler } from 'express'
import apis from './api/index.js'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options'

export const buildRouter = async () => {
  const apiRecord = await loadAPIs(apis)
  const router = Router()
  for (const { url, method, handler } of transformToRouteOptions<RequestHandler[]>(
    apiRecord,
  )) {
    router[method as HttpMethod](url, handler)
  }
  return router
}
```

Express accepts an array of handlers as the last argument, so a handler chain — an auth
guard followed by the endpoint — can be registered as it is.

### Koa

```ts
import Router from '@koa/router'
import type { Middleware } from 'koa'
import apis from './api/index.js'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options'

const router = new Router({ prefix: '/api/v1' })
const apiRecord = await loadAPIs(apis)

for (const { url, method, handler } of transformToRouteOptions<unknown[]>(apiRecord)) {
  router[method as HttpMethod](url, ...(handler as Middleware[]))
}
```

Koa takes middleware as separate arguments, so the chain is spread.

### Fastify

```ts
import type {
  HTTPMethods,
  RouteHandlerMethod,
  preHandlerHookHandler,
} from 'fastify'
import apis from './api/index.js'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'

const apiRecord = await loadAPIs(apis)

for (const { url, method, handler } of transformToRouteOptions<unknown[]>(apiRecord)) {
  fastify.route({
    url,
    method: method.toUpperCase() as HTTPMethods,
    preHandler: handler.slice(0, -1) as preHandlerHookHandler[],
    handler: handler.at(-1) as RouteHandlerMethod,
  })
}
```

Fastify separates hooks from the route handler; the last element is always the handler,
and everything before it is a `preHandler`.

## `transformToRouteOptions(apiRecord)`

Flattens `{ method: { url: handler } }` into an array of
`{ method, url, handler }`. Two behaviours matter:

- **The URL is made absolute.** Barrel keys are logical, but routers expect a leading
  slash. A key that already starts with `/` is left alone, so the transform is idempotent.
- **Static paths are registered before parameterized ones.** Paths without `:` come
  first; within each group, deeper paths come first. This prevents `/:id` from shadowing
  a sibling static route such as `/health`.

`handler` is generic, so pass the shape your framework registers. A bare function and a
middleware array are both valid.

## Route ordering example

```ts
const routes = transformToRouteOptions({
  get: {
    'user/:id': handlerA,
    'user/me': handlerB,
    'user/:id/posts': handlerC,
  },
})
// [
//   { method: 'get', url: '/user/me', handler: handlerB },
//   { method: 'get', url: '/user/:id/posts', handler: handlerC },
//   { method: 'get', url: '/user/:id', handler: handlerA },
// ]
```

## What this package does not do

Authentication, body parsing, mounting prefixes and documentation are the host's job.
A handler chain arrives already ordered — `authedApi` puts its guard first, `openApi`
leaves the handler alone — and this package registers it verbatim.

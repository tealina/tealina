# @tealina/server

The runtime part of Tealina file routing. It resolves the lazy `import()` barrel files written by `tealina align` and flattens them into a route list that a framework can register.

Zero dependencies, only two exports:

| Export | Purpose |
| --- | --- |
| `loadAPIs` | Awaits the two-level lazy import tree and returns plain handlers |
| `transformToRouteOptions` | Flattens it into a `{ method, url, handler }` list |

```bash
npm install @tealina/server
```

Requires Node ≥ 22.

## The Barrel Files It Reads

`align` writes one barrel file per method directory, then one at the API root:

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

Each level is "a promise of one module," and that module's `default` is described by the next level. `loadAPIs` awaits both levels and returns:

```ts
Record<method, Record<path, handler>>
```

Path keys keep their logical form — `'health'`, `'user/:id'` — with no leading slash.

## Registering Routes

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

Express accepts an array of handlers as its last argument, so a "guard + endpoint" chain can be registered as-is.

### Koa

```ts
import Router from '@koa/router'
import type { Middleware } from 'koa'
import apis from './api/index.js'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'

const router = new Router({ prefix: '/api/v1' })
const apiRecord = await loadAPIs(apis)

for (const { url, method, handler } of transformToRouteOptions<unknown[]>(apiRecord)) {
  router[method as HttpMethod](url, ...(handler as Middleware[]))
}
```

Koa receives middleware as separate arguments, so the chain needs to be spread.

### Fastify

```ts
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

Fastify separates hooks from the route handler: the last element is always the handler, and everything before it is `preHandler`.

## `transformToRouteOptions(apiRecord)`

Flattens `{ method: { url: handler } }` into a `{ method, url, handler }` array. Two behaviors you need to know:

- **URLs become absolute paths.** The barrel file's keys are logical paths, but routers expect a leading slash. Keys that already begin with `/` stay unchanged, so the transformation is idempotent.
- **Static paths are registered before parameterized paths.** Paths without `:` come first; within a group, deeper paths take priority. This way `/:id` does not shadow a sibling static route (such as `/health`).

`handler` is generic; pass whatever shape your framework needs at registration time. Bare functions and middleware arrays are both valid.

## Ordering Example

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

## What This Package Does Not Do

Authentication, request body parsing, mount prefixes, and documentation are the host's job. The handler chain arrives already ordered — `authedApi` puts the guard first, and `openApi` keeps the handler as-is — and this package only registers it as is.

# tealina-lite project

A minimal Node API server where the **directory layout is the route table** and the
**handler's type annotation is the single source of truth** — the router, the API
documentation, and the frontend's client types are all derived from it.

## Quick start

```bash
pnpm dev
```

- Service: http://localhost:8000
- API documentation: http://localhost:8000/api-doc/index.html
- Frontend (only if you scaffolded with `--web`): http://localhost:5173

Change the port by copying `.env.example` to `.env` and editing `PORT`.

## Layout

```
packages/server/
  types/                 the contract layer — see "The contract layer" below
  src/
    api-v1/              one directory per HTTP method, one file per endpoint
      get/health.ts  ->  GET  /api/v1/health
      get/index.ts       the route table for that method (generated — see below)
      post/login.ts  ->  POST /api/v1/login
      post/article.ts -> POST /api/v1/article
    app/                 routes, middlewares, static + docs wiring
      middlewares/auth/  openHandler marks a route public; verifyToken is the guard
    convention.ts        ties the handlers of one endpoint together, order-preserving
    config/env.ts        reads .env
  docs/api-v1.json       generated API document (do not edit by hand)

packages/web/            only when scaffolded with --web — see "The frontend" below
  index.html
  vite.config.ts         dev server on 5173, proxying /api to the server
  src/
    main.ts              the page
    api/client.ts        `req`, typed from the server's handlers
```

`GET /api/v1/health`, `POST /api/v1/login` and `POST /api/v1/article` are the three
demos. Delete them once you have your own endpoints. Scaffolded with `--js`, every `.ts`
above is a `.js` and the annotation moves into JSDoc (see "The convention" below); nothing
else about the layout changes.

## The convention

A handler file's default export goes through `convention(...)`, and its **type
annotation** is what everything else is derived from:

```ts
import type { OpenHandler } from '../../../types/handler.js'
import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

interface LoginPayload {
  account: string
  password: string
}

type ApiType = OpenHandler<{ body: LoginPayload }, { token: string }>

const handler: ApiType = async (req, res) => {
  res.send({ token: 'JWT token' })
}

export default convention(openHandler, handler)
```

That `openHandler` argument is what makes the route public — see
[Public vs. authed endpoints](#public-vs-authed-endpoints).

- Use `interface` (not `type`) for payload shapes: the doc generator reads the name off
  the declaration, and an inline object type would be inlined into the document.
- JSDoc comments become documentation; `//` comments are ignored.

Scaffolded with `--js`, the same handler is written in JSDoc, and the types come from a
global namespace instead of an import — nothing to count `../` for, which matters because
`align` writes stubs into directories that did not exist when the type file was written:

```js
import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

/**
 * @typedef {object} LoginPayload
 * @property {string} account
 * @property {string} password
 */

/** @type {Tealina.Open<{ body: LoginPayload }, { token: string }>} */
const handler = async (req, res) => {
  res.send({ token: 'JWT token' })
}

export default convention(openHandler, handler)
```

`Tealina.Open` and `Tealina.Authed` mirror `OpenHandler` and `AuthedHandler` argument for
argument; a handler with no payload writes the bare global `EmptyObj`. All three are
declared at the end of `types/handler.d.ts`, the one type file a handler already imports.

The type goes in a JSDoc block directly above the `const` — the same place the TypeScript
tree puts `: ApiType`, and the form `align` writes for you. Two things it cannot be talked
out of. It stays on the `const`, not inline in the `convention(...)` call: `convention` is
how the generator finds the handler, and an inline annotation leaves it holding an
expression instead of a name. And it stays a `const` — on a `function` declaration the
`@type` tag *checks* the function rather than typing it.

The description has to share that block. A second JSDoc block above it is not attached to
the declaration at all, so the endpoint would appear in the documentation with no
description — and a block separated by a blank line is not read either.

### Adding an endpoint

The method name and the filename are the method and the path:

```bash
pnpm -F server v1 post/user     # creates src/api-v1/post/user.ts
```

Then edit the generated stub. The `get/index.ts` and `post/index.ts` files are
**derived artifacts** — regenerate them with:

```bash
pnpm -F server align
```

Run `align` whenever you add, rename or delete a handler file by hand.

## Public vs. authed endpoints

**Every endpoint requires an `Authorization` header unless its own handler chain says
otherwise.** The declaration lives in the handler file, not in the router: pass the
`openHandler` marker to `convention` and the route is registered without the guard.

```ts
// src/api-v1/get/health.ts — public
export default convention(openHandler, handler)

// src/api-v1/post/article.ts — guarded, which is what you get by default
export default convention(handler)
```

`openHandler` is itself an ordinary middleware — it does nothing and hands straight on to
the next one (`next()` on express and koa, a resolved promise on fastify, where it is a
preHandler). It is not stripped out before registration, so the chain you write is the
chain that runs.

Nothing else decides it, so a new endpoint is private until you say otherwise. `/article`
omits the marker, which is why it answers `401` without a header:

```bash
curl -i -X POST localhost:8000/api/v1/article    # 401
curl -i -X POST localhost:8000/api/v1/article -H 'Authorization: anything'   # 200
```

The marker and the type annotation are two halves of the same decision — a chain carrying
`openHandler` should be declared `OpenHandler`, and a guarded one `AuthedHandler`
(`Tealina.Open` and `Tealina.Authed` in the JavaScript tree). Change
them together: **nothing checks that they agree**, and a mismatch compiles cleanly and
then surprises you at runtime (a route the types say is public answering `401`, or a
handler reaching for `locals.userId` on a route anyone can call).

The guard itself is `verifyToken` — `openHandler`'s neighbour in
`src/app/middlewares/auth/`. It currently accepts any header value and sets `userId` to a
placeholder. Replace the `TODO` with your real token check. The 401 body is
`{ "code": "Unauthorized", "message": "..." }`.

## API documentation

```bash
pnpm -F server gdoc    # regenerates docs/api-v1.json, served at /api-doc/index.html
```

The document is **not** checked in — it is produced by the command above, and the docs
route reads it from disk. If `/api-doc/index.html` returns an error about a missing file,
run `gdoc`.

## The frontend

If you scaffolded with `--web`, `packages/web` is a Vite project with no framework. It is
deliberately small — two source files — because what it demonstrates is not a UI, it is
the client:

```ts
// packages/web/src/api/client.ts
import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'server/api/v1'

export const req = createFetchClient<ApiTypesForClient, RequestInit>(requester)
```

`ApiTypesForClient` is the server's own handlers, projected for a client. It arrives
through the `server` package's `exports["./api/v1"]` entry, so there is no second
declaration of the API to keep in step — **rename a field in a handler and the frontend
stops compiling**, which is the whole point.

`src/main.ts` is the page. Scaffolded with `--web` it calls `GET /health` once and renders
the result; installed with `init --web` it calls nothing, because your route table starts
empty and a call to a route the contract does not have is a compile error. Either way it
is a placeholder — write your real app in `src/`.

```ts
import { req } from './api/client'

const health = await req.get('/health')
const isOk: boolean = health.isOk
```

Use it:

```bash
pnpm -F web dev      # http://localhost:5173
```

Two things worth knowing:

- Resolving those types pulls the server's **source** in (`api-v1.d.ts` → `src/api-v1/`
  → `convention.ts` → `express`/`fastify`/`koa`). So the server's own
  `@tealina/utility-types` and framework type packages must stay installed. A
  `skipLibCheck` in the frontend will not paper over a break here, because this is `.ts`,
  not `.d.ts`.
- The proxy is what keeps this same-origin: `vite.config.ts` forwards `/api` to
  `http://localhost:8000`, so no server template needs CORS headers.

### Guarded endpoints

`req` sends no credentials of its own. `verifyToken` only checks that an `Authorization`
header is present, so log in through the open endpoint and hand the token over:

```ts
import { req, setToken } from './api/client'

const { token } = await req.post('/login', { body: { account, password } })
setToken(token)

await req.post('/article', { body: { title: 'hello', content: '...' } })
// authorized. The same call without a token answers 401.
```

### Adding a frontend without `--web`

Nothing about the above is special to Vite or to this scaffold. The mechanism is one
dependency and one import, and you can wire any package up to it by hand:

1. In `packages/web/package.json`, link the server by its package name (`server`):

   ```json
   { "devDependencies": { "server": "workspace:*" } }
   ```

2. Run `pnpm install` at the repo root — this creates the symlink.

3. Import the types:

   ```ts
   import type { ApiTypesForClient } from 'server/api/v1'
   ```

   `import type` is **required**: the `exports` entry publishes a `types` condition only.

A JavaScript frontend reaches the same types through a JSDoc `typedef` instead of a type
argument; `packages/web/js` in the scaffold's template is the worked example.

## The contract layer

`packages/server/types/` is the part you should not casually restructure:

- `handler.d.ts` — `OpenHandler` / `AuthedHandler` and the projections that derive
  client and doc types. Imports `./alias.js`. Also carries the `Tealina.*` global
  namespace, which is how the JavaScript tree's handlers name these two without an
  import; it is inert in a TypeScript project.
- `alias.d.ts` — the one framework-specific file. This is where express/koa/fastify
  request and response types get bound to the generic handler shape.
- `api-v1.d.ts` — the exit point. `ApiTypesForDoc` **must** stay the first export in
  this file; the doc generator picks it up by position. Also referenced by the
  `exports["./api/v1"]` entry in `package.json`.
- `common.d.ts` — shared payload/header/locals shapes.

Keep the `v1` name: the api directory, `types/api-v1.d.ts`, the `exports` key,
`docs/api-v1.json`, the docs route's `baseURL` and the router prefix are all pinned to
it. Renaming the api directory is not supported.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | start the server with reload |
| `pnpm build` | build the server |
| `pnpm -F server v1 <method> <path>` | create a handler stub |
| `pnpm -F server align` | rewrite the generated `index.ts` files from the file tree |
| `pnpm -F server gdoc` | regenerate the API document |
| `pnpm -F server build` | compile to `dist/` |
| `pnpm -F server start` | run the compiled build |
| `pnpm -F web dev` | start the frontend dev server |
| `pnpm -F web build` | type-check and bundle the frontend |

The last two need `--web` to have been used. That is also what rewrites the first two
rows to `pnpm -r --parallel dev` / `pnpm -r build`, so they cover both packages instead
of just the server.

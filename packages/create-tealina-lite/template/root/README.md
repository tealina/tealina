# tealina-lite project

A minimal Node API server where the **directory layout is the route table** and the
**handler's type annotation is the single source of truth** — the router, the API
documentation, and (if you add a frontend) the client types are all derived from it.

## Quick start

```bash
pnpm dev
```

- Service: http://localhost:8000
- API documentation: http://localhost:8000/api-doc/index.html

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
```

`GET /api/v1/health`, `POST /api/v1/login` and `POST /api/v1/article` are the three
demos. Delete them once you have your own endpoints.

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
`openHandler` should be declared `OpenHandler`, and a guarded one `AuthedHandler`. Change
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

## Adding a frontend

The server already exposes its types to the workspace, so a sibling package can import
them directly — no code generation, no build step, no `paths` in tsconfig.

1. Create `packages/web` as you normally would.

2. In `packages/web/package.json`, link the server by its package name (`server`):

   ```json
   { "devDependencies": { "server": "workspace:*" } }
   ```

3. Run `pnpm install` at the repo root — this creates the symlink.

4. In the frontend:

   ```ts
   import type { ApiTypesForClient } from 'server/api/v1'
   ```

   `import type` is **required**: the `exports` entry publishes a `types` condition only.
   Changing a handler's response type now breaks the frontend build, which is the point.

Two things worth knowing:

- Resolving those types pulls the server's **source** in (`api-v1.d.ts` → `src/api-v1/`
  → `convention.ts` → `express`/`fastify`/`koa`). So the server's own
  `@tealina/utility-types` and framework type packages must stay installed. A
  `skipLibCheck` in the frontend will not paper over a break here, because this is `.ts`,
  not `.d.ts`.
- Your frontend dev server needs a proxy for `/api` → `http://localhost:8000`. In Vite:

  ```ts
  server: { proxy: { '/api': 'http://localhost:8000' }, open: true }
  ```

## The contract layer

`packages/server/types/` is the part you should not casually restructure:

- `handler.d.ts` — `OpenHandler` / `AuthedHandler` and the projections that derive
  client and doc types. Imports `./alias.js`.
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
| `pnpm -F server v1 <method> <path>` | create a handler stub |
| `pnpm -F server align` | rewrite the generated `index.ts` files from the file tree |
| `pnpm -F server gdoc` | regenerate the API document |
| `pnpm -F server build` | compile to `dist/` |
| `pnpm -F server start` | run the compiled build |

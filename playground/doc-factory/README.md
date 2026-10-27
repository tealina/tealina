# tealina project

A typed Node API server where **each handler file is a route** and each
**handler's type annotation is the single source of truth** — the router, the API
documentation and the frontend's client types are all derived from it.

The backend is three workspace packages with one job each:

| Package | Owns |
| --- | --- |
| `backend/core` | the contract layer — handler types, the framework binding, `openApi`/`authedApi` |
| `backend/api-v1` | one API version — the route tree, its docs, and the router that mounts them |
| `backend/server` | the host — the framework instance, the port, static assets |

`packages/web` is optional (`--web`): a minimal Vite frontend that reads the API types
rather than restating them.

## This playground: the doc factory

This project is the documentation UI's testbed. It keeps a handler for every shape the
page has to render — plain objects, unions, recursive tuples, a status-coded response,
three kinds of stream, and a file download — plus a second, static OpenAPI source and a
password-protected page, so the selector, importer, playground and login can all be
exercised without touching the library.

It lives inside the tealina monorepo and the workspace file links `tealina`,
`@tealina/server` and `@tealina/doc-ui` to `../../packages/*`, so editing the doc UI's
source shows up here without a publish.

```bash
pnpm install
pnpm -F api-v1 gdoc    # after any handler change; docs/api.json is not checked in
pnpm dev
```

The page is at http://localhost:8000/api-doc/index.html.

- Sources: `v1` is generated from the handlers in `backend/api-v1`; `v2 (OpenAPI)` is
  `backend/server/docs/openapi.json`, a static spec that no package mounts.
- Login: `123` (session, the default) or `headers`, which makes the page send
  `auth: xxxx` when it fetches the document. `DOC_PASSWORD` in `backend/server/.env`
  changes the first.
- The v1 document itself answers `401` until the session is established or the
  `auth: xxxx` header is sent; that is the page's login working, not a broken route.
- `/api/v1/health` goes through a custom request handler served from
  `/api-doc/use-fetch.js`, to show that an endpoint can bypass the generated fetcher.

Demo endpoints, all under `/api/v1`:

| Endpoint | Shows |
| --- | --- |
| `GET /health` | a status-coded response (`WithStatusCode<200, …>`) |
| `POST /user/create` | an authed body, a named input type and `examples` |
| `POST /user/update` | all-optional input fields |
| `POST /user/checkin` | a union of object and tuple |
| `POST /case/primitive` | booleans and a documented default |
| `POST /case/recursive` | recursive tuples and entities |
| `GET /stream/json` | chunked JSON through `MultiTarget` |
| `GET /stream/logs` | chunked plain text |
| `GET /stream/sse` | server-sent events |
| `GET /stream/fileDownload?lines=N` | `Content-Disposition` and a generated file |

## Quick start

```bash
pnpm dev
pnpm check     # format, lint and type-check (Vite+)
```

- Service: http://localhost:8000
- API documentation: http://localhost:8000/api-doc/index.html
- Frontend (only with `--web`): http://localhost:5173

Change the port by copying `backend/server/.env.example` to `backend/server/.env` and
editing `PORT`.

## Layout

```
backend/
  core/
    types/
      handler.d.ts        OpenHandler / AuthedHandler and the projections
      common.d.ts         shared payload / header / locals shapes
      alias.d.ts          binds express/fastify/koa's request and response to the handlers
    src/access/
      index.ts            openApi / authedApi — the two ways a handler file ends
      verifyToken.ts      the guard authedApi puts in front of a chain

  api-v1/
    src/
      api/                one directory per HTTP method, one file per endpoint
        get/health.ts  ->  GET  /api/v1/health
        get/index.ts       the route table for that method (generated)
        post/login.ts  ->  POST /api/v1/login
        post/article.ts -> POST /api/v1/article
      router.ts           turns a route table into framework routes
      doc.ts              serves this version's document json
      mount.ts            puts the api and its json on the framework instance
    version.js            API_VERSION and API_BASE_URL — the one place they are written
    types/api.d.ts        the contract's exit point (exports["./api"])
    tealina.config.ts     apiDir / apiBaseURL / typesDir
    docs/api.json         generated API document (do not edit by hand)

  server/
    src/
      config/env.ts       reads .env
      routes/static/      static assets
      doc.ts              the documentation page for every mounted version
      app.ts              builds the app, mounts api-v1, serves its page
      index.ts            starts listening
    public/               served by the static assets route

packages/web/             only with --web
  src/
    main.ts               the page
    api/client.ts         `req`, typed from the handlers in api-v1
```

A new API version is a new package (`backend/api-v2`) that depends on `core` and is
mounted by `server` beside `api-v1`. Nothing in `core` or in the frontend names a version.

A handler can stay in `.js` while the rest of the project is TypeScript; it is then
annotated with a JSDoc `@type` rather than a type annotation, and nothing about the layout
changes. The setup is in the scaffold's README under "Keeping JavaScript handlers".

## The convention

A handler file imports its types from `core`, and its **type annotation** is what
everything else is derived from:

```ts
import type { OpenHandler } from 'core/handler'
import { openApi } from 'core/access'

interface LoginPayload {
  account: string
  password: string
}

type ApiType = OpenHandler<{ body: LoginPayload }, { token: string }>

const handler: ApiType = async (req, res) => {
  res.send({ token: 'JWT token' })
}

export default openApi(handler)
```

Which of the two you call decides whether the route is public — see
[Public vs. authed endpoints](#public-vs-authed-endpoints).

- Use `interface` (not `type`) for payload shapes: the doc generator reads the name off
  the declaration, and an inline object type would be inlined into the document.
- JSDoc comments become documentation; `//` comments are ignored.

When a handler file is kept in `.js` during a migration, the same type is written as a
JSDoc `@type` on the `const`, reaching it through `import('core/handler')` — never a
global name. The type stays on the `const`, not inline in the `openApi(...)` call: that
call is how the generator finds the handler, and an inline annotation leaves it holding an
expression instead of a name.

The description has to share that block. A second JSDoc block above it is not attached to
the declaration at all, so the endpoint would appear in the documentation with no
description — and a block separated by a blank line is not read either.

### Adding an endpoint

The method name and the filename are the method and the path:

```bash
pnpm -F api-v1 run create post/user # creates src/api/post/user.ts
```

Then edit the generated stub. The `get/index.ts` and `post/index.ts` files are
**derived artifacts** — regenerate them with:

```bash
pnpm -F api-v1 align
```

Run `align` whenever you add, rename or delete a handler file by hand.

## Public vs. authed endpoints

**Every endpoint requires an `Authorization` header unless its own handler file ends in
`openApi`.** The declaration lives in the handler file, not in the router, and the call you
write is the whole of it:

```ts
// src/api/get/health.ts — public
export default openApi(handler)

// src/api/post/article.ts — guarded, which is what you get by default
export default authedApi(handler)
```

`authedApi` is not a marker the router looks for: it puts `verifyToken` at the front of the
chain at runtime, so the guard is the first element of the chain you wrote and is registered
with the rest of it.

Nothing else decides it, so a new endpoint is private until you say otherwise. `/article`
calls `authedApi`, which is why it answers `401` without a header:

```bash
curl -i -X POST localhost:8000/api/v1/article    # 401
curl -i -X POST localhost:8000/api/v1/article -H 'Authorization: anything'   # 200
```

The two call names are also two handler types: a chain built with `openApi` is declared
`OpenHandler`, one built with `authedApi` `AuthedHandler`. On express and koa that pairing
is checked, so `openApi(anAuthedHandler)` does not compile and a handler reading
`res.locals.userId` cannot end up on a route anyone can call. Two gaps are left, both
measured rather than assumed:

- `authedApi(anOpenHandler)` compiles everywhere and installs the guard anyway. The route is
  then stricter than its own types claim, which is the safe direction to be wrong in.
- Fastify checks neither. `FastifyRequest` is module-augmented with `locals`, so both kinds
  of handler resolve to the same request type there and the two calls accept the same set.

The guard itself is `backend/core/src/access/verifyToken.ts`. It currently accepts any
header value and sets `userId` to a placeholder. Replace the `TODO` with your real token
check. The 401 body is `{ "code": "Unauthorized", "message": "..." }`.

## API documentation

```bash
pnpm -F api-v1 gdoc    # regenerates docs/api.json
```

Each api version publishes its document at `<API_BASE_URL>/_doc/api.json` (for the
scaffold, `/api/v1/_doc/api.json`). The page that displays it lives in the `server`
package at `/api-doc/index.html`, and it lists every version the host mounts.

The document is **not** checked in — it is produced by the command above, and the json
route reads it from disk. If the page shows an error about a missing file, run `gdoc`.

## The frontend

If you scaffolded with `--web`, `packages/web` is a Vite project with no framework. It is
deliberately small — two source files — because what it demonstrates is not a UI, it is
the client:

```ts
// packages/web/src/api/client.ts
import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'api-v1/api'

export const req = createFetchClient<ApiTypesForClient, RequestInit>(requester)
```

`ApiTypesForClient` is the handlers in `api-v1`, projected for a client. It arrives through
the `api-v1` package's `exports["./api"]` entry, so there is no second declaration of the
API to keep in step — **rename a field in a handler and the frontend stops compiling**,
which is the whole point.

`src/main.ts` is the page. It calls `GET /health` once and renders the result; it is a
placeholder — write your real app in `src/`.

```ts
import { req } from './api/client'

const health = await req.get('health')
const isOk: boolean = health.isOk
```

Use it:

```bash
pnpm -F web dev      # http://localhost:5173
```

Two things worth knowing:

- Resolving those types pulls the handlers' **source** in (`api.d.ts` → `api-v1/src/`
  → `core` → `express`/`fastify`/`koa` → `tealina/utility-types`). So the backend's own
  `tealina` and framework type packages must stay installed. A `skipLibCheck` in the
  frontend will not paper over a break here, because this is `.ts`, not `.d.ts`.
- The proxy is what keeps this same-origin: `vite.config.ts` forwards `[API_BASE_URL]` to
  `http://localhost:8000`, so no server template needs CORS headers. Retarget it if `PORT`
  is not 8000.

### Guarded endpoints

`req` sends no credentials of its own. `verifyToken` only checks that an `Authorization`
header is present, so log in through the open endpoint and hand the token over:

```ts
import { req, setToken } from './api/client'

const { token } = await req.post('login', { body: { account, password } })
setToken(token)

await req.post('article', { body: { title: 'hello', content: '...' } })
// authorized. The same call without a token answers 401.
```

### Adding a frontend without `--web`

Nothing about the above is special to Vite or to this scaffold. The mechanism is one
dependency and one import:

1. In `packages/web/package.json`, link the API package by its workspace name:

   ```json
   { "devDependencies": { "api-v1": "workspace:*" } }
   ```

2. Run `pnpm install` at the repo root — this creates the symlink.

3. Import the types:

   ```ts
   import type { ApiTypesForClient } from 'api-v1/api'
   ```

   `import type` is **required**: the `exports` entry publishes a `types` condition only.

## The contract layer

`backend/core/types/` and `backend/api-v1/types/api.d.ts` are the part you should not
casually restructure:

- `core/types/handler.d.ts` — `OpenHandler` / `AuthedHandler` and the projections that
  derive client and doc types. Imports `./alias.js`.
- `core/types/alias.d.ts` — the one framework-specific file. This is where
  express/fastify/koa request and response types get bound to the generic handler shape.
  Express's version repeats its call signature so that a `.js` handler kept during a
  migration can carry a JSDoc `@type` while staying `async`; do not remove the repetition.
- `core/types/common.d.ts` — shared payload/header/locals shapes.
- `api-v1/types/api.d.ts` — the exit point. `ApiTypesForDoc` **must** stay the first
  export in this file; the doc generator picks it up by position. It is what
  `exports["./api"]` in `api-v1/package.json` points at.

`apiDir` in `api-v1/tealina.config.ts` names the route tree and `apiBaseURL` names the
prefix the router mounts it under — both read `API_BASE_URL` from `version.js`, so the
config, the mount, the docs page, the server log line and the frontend's proxy all name the
same prefix. The public artifacts keep fixed names — `types/api.d.ts` and
`exports["./api"]` — so moving the api directory changes the config and the router's
import, not what a frontend imports.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | build the two libraries, then run every watcher in parallel |
| `pnpm build` | build every package |
| `pnpm start` | run the compiled server |
| `pnpm check` | format, lint and type-check everything (Vite+) |
| `pnpm fmt` | rewrite files with Oxfmt |
| `pnpm lint` | report lint and type errors with Oxlint |
| `pnpm -F api-v1 run create <method> <path>` | create a handler stub |
| `pnpm -F api-v1 align` | rewrite the generated `index.*` files from the file tree |
| `pnpm -F api-v1 gdoc` | regenerate the API document |
| `pnpm -F api-v1 dev` | watch-compile the api package |
| `pnpm -F core dev` | watch-compile the contract layer |
| `pnpm -F server dev` | start the server with reload |
| `pnpm -F server build` | compile the host |
| `pnpm -F server start` | run the compiled host |
| `pnpm -F web dev` | start the frontend dev server (with `--web`) |
| `pnpm -F web build` | type-check and bundle the frontend (with `--web`) |

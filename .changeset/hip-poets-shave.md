---
"create-tealina": minor
---

A minimal tealina scaffold: no database, no Prisma, three backend workspace packages
(`core`, `api-v1`, `server`) instead of four. There is no frontend by default — the contract
is published through `api-v1`'s `exports["./api"]`, so the types are ready for whatever client
you bring. `--web` writes a minimal Vite one.

The core idea is unchanged: the directory tree is the route table, and each handler's type
annotation is the single source of truth that routes, API docs and frontend types derive from.

Three demo endpoints ship: `GET /health` and `POST /login` (public), `POST /article`
(authenticated, with a typed body and response). Endpoints require a token by default; one
becomes public by ending its file in `openApi(handler)` instead of `authedApi(handler)`, so
the guard lives with the endpoint rather than in a path table. On express and koa the pair is
also a type check: the guard reads `res.locals.userId`, and `openApi` refuses a handler
declared `AuthedHandler`.

No error handler and no not-found handler ship with it, on any framework. An unknown route
and a thrown error are answered by the framework's own default — express's `finalhandler`,
koa's `ctx.onerror` — so shaping those responses stays the application's policy. The demo
handlers answer for themselves: `verifyToken` writes the 401 body directly.

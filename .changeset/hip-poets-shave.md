---
"create-tealina": minor
---

Initial release. A minimal tealina scaffold: no database, no Prisma, three backend
workspace packages (`core`, `api-v1`, `server`) instead of four. The default output has no
frontend either — the contract is published through `api-v1`'s `exports["./api"]`, so the
types are ready for whatever client you bring. `--web` writes a minimal Vite one if you
would rather not start from nothing; without it the output is the backend alone.

Keeps the core idea unchanged — the directory tree is the route table, and each
handler's type annotation is the single source of truth that routes, API docs and
frontend types are all derived from.

Three demo endpoints ship with it: `GET /health` and `POST /login` (public),
`POST /article` (authenticated, and the example of a request body with a typed
response). Endpoints require a token by default; one becomes public by ending its file in
`openApi(handler)` instead of `authedApi(handler)`, so the decision — and the guard itself —
lives with the endpoint rather than in a path table in the router. On express and koa the
pair is also a type check: the guard reaches for `res.locals.userId`, and `openApi` refuses
a handler declared `AuthedHandler`.

No error handler and no not-found handler ship with it, on any of the three frameworks.
An unknown route and a thrown error are answered by the framework's own default — express's
`finalhandler`, koa's `ctx.onerror` — so shaping those responses stays the application's
policy rather than the convention's. The scaffold has no opinion to override, and nothing
to delete before you can install your own. What the demo handlers do answer, they answer
themselves: `verifyToken` writes the 401 body directly, which is why the removed
`errorHandler` was never on any path a request took.

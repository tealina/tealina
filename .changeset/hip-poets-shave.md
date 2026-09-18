---
"create-tealina-lite": minor
---

Initial release. A minimal tealina scaffold: no database, no Prisma, one `server`
workspace package instead of four. The default output has no frontend either — the
contract is published through `server`'s `exports["./api/v1"]`, so the types are ready
for whatever client you bring. `--web` writes a minimal Vite one if you would rather
not start from nothing; without it the output is the server alone.

Keeps the core idea unchanged — the directory tree is the route table, and each
handler's type annotation is the single source of truth that routes, API docs and
frontend types are all derived from.

Three demo endpoints ship with it: `GET /health` and `POST /login` (public),
`POST /article` (authenticated, and the example of a request body with a typed
response). Endpoints require a token by default; one becomes public by carrying the
`openHandler` marker in its handler chain — `convention(openHandler, handler)` — so the
decision lives with the endpoint rather than in a path table in the router.

`--js` scaffolds the same project as JavaScript, with the handler type in a JSDoc `@type`
block above the declaration instead of a type annotation on it. It names the contract
through a `Tealina.*` global namespace declared at the end of `types/handler.d.ts` — the
one type file a handler already imports — so a stub that `v1` writes into a directory
nobody has created yet can name its own API type without counting `../`. The TypeScript
tree carries the namespace too and never writes it.

For that annotation to be accepted on an `async` handler, each framework's
`HandlerAliasCore` carries a second call signature repeating the first. A JSDoc `@type` is
checked as the function's own signature rather than as an assignment to it, so with a
single signature the handler's return type becomes express's `unknown`, koa's `void` or
fastify's `R | void | Promise<R | void>` — none of which is the global `Promise`, and
`async` is then a compile error. Repeating the signature verbatim rather than narrowing it
to `Promise<void>` is the point: the contract still accepts the synchronous handlers it
accepted before.

No error handler and no not-found handler ship with it, on any of the three frameworks.
An unknown route and a thrown error are answered by the framework's own default — express's
`finalhandler`, koa's `ctx.onerror` — so shaping those responses stays the application's
policy rather than the convention's. The scaffold has no opinion to override, and nothing
to delete before you can install your own. What the demo handlers do answer, they answer
themselves: `verifyToken` writes the 401 body directly, which is why the removed
`errorHandler` was never on any path a request took.

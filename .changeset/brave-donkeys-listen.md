---
"create-tealina": minor
---

Gather the access module into `src/access/`

In `core`, `src/access.ts` is `src/access/index.ts` and `src/middlewares/auth/verifyToken.ts`
is `src/access/verifyToken.ts` — the two files answer one question, is this route public or
guarded, and `verifyToken` is imported only by `access/index`, so `src/middlewares/auth/` is
gone.

A handler imports `'core/access'` instead of `'../../../access.js'`. `core` is a workspace
package with its own `exports` map, so the specifier is the same at any depth, in any api
tree, on any framework.

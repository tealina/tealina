---
"create-tealina": minor
---

Gather the access module into `src/access/`

In the `core` package, `src/access.ts` is `src/access/index.ts`, and
`src/middlewares/auth/verifyToken.ts` is `src/access/verifyToken.ts`. The two files answer
one question — is this route public or guarded — and `verifyToken` is imported by nothing
but `access/index`, so they sit in one directory instead of two. `src/middlewares/auth/`
held that single file and is gone.

A handler's import follows: `'../../../access.js'` is `'core/access'`. Because `core` is a
workspace package with its own `exports` map, the specifier is the same in every directory
of every api tree, however deep the handler sits, whichever framework the project uses.

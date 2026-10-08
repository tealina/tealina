---
"create-tealina": minor
---

Gather the access module into `src/access/`

`src/access.ts` is `src/access/index.ts`, and `src/middlewares/auth/verifyToken.ts` is
`src/access/verifyToken.ts`. The two files answer one question — is this route public or
guarded — and `verifyToken` is imported by nothing but `access/index`, so they sit in one
directory instead of two. `src/middlewares/auth/` held that single file and is gone.

A handler's import follows: `'../../../access.js'` is `'../../../access/index.js'`. The
config names the directory once, in `accessDir`, and the stubs it writes are measured from
there, so the six template trees differ only in their extension.

A project scaffolded earlier is unaffected — the specifier lives in its own handlers and
config, which this package never reads back. `init` moves with the rest: a host is given
`src/access/index.<ext>` and `src/access/verifyToken.<ext>` where it used to get the old
pair.

---
"tealina": patch
---

Quote a generated key only when it is not an identifier

A generated barrel reads `get: import('./get/index.js')` and `health: import('./health.js')`
rather than carrying quotes on both; `'user/:id'` and `'user/create'` keep theirs. That is
the same judgement a formatter makes — `quoteProps: 'as-needed'` — so a barrel comes out in
the shape one would leave it in, and the `align` that follows a formatting pass no longer
rewrites the file back.

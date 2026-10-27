---
"tealina": patch
---

Quote a generated key only when it is not an identifier

A generated barrel reads `get: import('./get/index.js')` and `health: import('./health.js')`
without quotes; `'user/:id'` and `'user/create'` keep theirs. That is a formatter's
`quoteProps: 'as-needed'` judgement, so a barrel comes out as one would leave it, and the
`align` after a formatting pass no longer rewrites it back.

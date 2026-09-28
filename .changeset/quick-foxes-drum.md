---
"tealina": minor
"@tealina/server": minor
---

Generate barrel keys as the logical path, and put the slash back at the router

The generated `get/index.ts` reads `'health': import('./health.js')` instead of
`'/health': ...`, which is the half of the record a call site sees. `@tealina/server`
prepends the slash in `transformToRouteOptions`, so a router still receives an absolute url
— express refuses one that does not begin with `/`.

**Upgrade the two together.** `align` regenerates a kind index from the file tree rather
than patching it, so running it after this release rewrites every key to the new spelling —
against an older `@tealina/server` the slash then never comes back and every route breaks.
Upgrading the packages alone rewrites nothing: a barrel keeping `'/health'` still registers
`/health`, because the normalization is idempotent, so a project can migrate by running
`align` when it is ready rather than on the release.

---
"tealina": minor
"@tealina/server": minor
---

Generate barrel keys as the logical path, and put the slash back at the router

The generated `get/index.ts` reads `'health': import('./health.js')` instead of
`'/health': ...`. `@tealina/server` prepends the slash in `transformToRouteOptions`, so a
router still receives an absolute url — express refuses one that does not begin with `/`.

**Upgrade the two together.** `align` regenerates a kind index from the file tree, so running
it after this release rewrites every key to the new spelling — against an older
`@tealina/server` the slash then never comes back and every route breaks. Upgrading the
packages alone rewrites nothing (a barrel keeping `'/health'` still registers `/health`), so a
project can migrate by running `align` when it is ready.

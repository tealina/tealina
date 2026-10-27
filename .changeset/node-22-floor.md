---
"tealina": patch
"@tealina/server": patch
"@tealina/client": patch
"@tealina/utility-types": patch
"@tealina/doc-types": patch
"@tealina/doc-ui": patch
"create-tealina": patch
---

Require Node 22

`vite-plus-core`'s tsdown calls `Promise.withResolvers`, which Node 20 does not have, so the
build failed on the floor the packages claimed to support. `engines.node` is `>=22`, the
Node-side `target` is `node22`, and `@types/node` is `^22`. That is the floor: CI and `.nvmrc`
run the default Node 24.

Node 20 is no longer supported. Nothing in the published API changed.

---
"@tealina/client": patch
"@tealina/server": patch
---

Declare Node 20 as the floor

`@tealina/server` was built with `target: 'es2022'`. It is `node20` now, matching the other
Node-side packages and the `engines.node: ">=20.19"` they declare. Its output is
byte-identical — the source uses no syntax that sits between the two — so this states the
real floor rather than changing the artifact.

`@tealina/client` gains the same `engines.node`, and its own `target` deliberately stays
`es6`: it is the browser-side library the web template imports, and the low target is the
point. Its options also move out of `tsdown.config.ts` and into the `pack` block of its
`vite.config.ts`, which is where every other package keeps them — Vite+ advises against a
separate `tsdown.config.ts`, and this was the last one. The build is unchanged.

---
"@tealina/client": patch
"@tealina/server": patch
---

Declare Node 22 as the floor

`@tealina/server` was built with `target: 'es2022'` and is `node22` now, matching the other
Node-side packages and the `engines.node: ">=22"` they declare. Its output is byte-identical,
so this states the real floor rather than changing the artifact.

`@tealina/client` gains the same `engines.node`, and its `target` deliberately stays `es6`: it
is the browser-side library the web template imports. Its options also move out of
`tsdown.config.ts` into the `pack` block of its `vite.config.ts`, where every other package
keeps them. The build is unchanged.

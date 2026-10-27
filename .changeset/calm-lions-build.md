---
"create-tealina": patch
---

Build with tsdown instead of unbuild

`build.config.ts` is gone; `dist/index.mjs` is packed by tsdown through the `pack` block in
the existing `vite.config.ts`. Still one file, still minified, still at the path `index.js`
and the root `cproj` script point at.

`inlineDependencies: true` and the `prompts` alias are not carried over — neither did
anything: unbuild externals every `dependencies` entry before consulting `inlineDependencies`,
so `chalk`, `minimist` and `prompts` have always been plain imports for the consumer to
install, and tsdown's default does the same.

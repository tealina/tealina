---
"create-tealina": patch
---

Build with tsdown instead of unbuild

`build.config.ts` is gone; `dist/index.mjs` is now packed by tsdown, through the `pack`
block in the existing `vite.config.ts`. Still one file, still minified, still at the path
`index.js` and the root `cproj` script point at.

`inlineDependencies: true` and the `prompts` alias are not carried over, because neither
did anything: unbuild marks every package listed in `dependencies` as external before it
ever consults `inlineDependencies`, so `chalk`, `minimist` and `prompts` have always been
plain imports in the output, left for the consumer to install. tsdown's default does the
same, so the artifact's import list is unchanged.

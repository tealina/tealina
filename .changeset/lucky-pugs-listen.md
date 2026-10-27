---
"@tealina/server": patch
---

Build with tsdown instead of tsup

`tsup` cannot build this package under TypeScript 6: it hard-codes `baseUrl: "."` into the
declaration rollup, which 6.0 rejects outright (TS5101), so the build stopped before writing
anything. The package is now packed by tsdown, through `vite.config.ts` and `vp pack`.

The output is deliberately the same: one CommonJS `dist/index.js` plus `dist/index.d.ts`. No
API, `exports` or entry-path change.

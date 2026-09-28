---
"@tealina/server": patch
---

Build with tsdown instead of tsup

`tsup` cannot build this package under TypeScript 6. It hard-codes `baseUrl: "."` into
the declaration rollup it hands the compiler, and 6.0 rejects the option outright
(TS5101) — so the build stops before writing anything. The package is now packed by
tsdown, through `vite.config.ts` and the `vp pack` command that wraps it.

The output is deliberately the same: one `dist/index.js` in CommonJS, which is what
`main` points at and what Node sees given the package has no `"type": "module"`, plus
one `dist/index.d.ts`. No API, `exports` or entry-path change.

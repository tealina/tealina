---
"tealina": patch
---

Build with tsdown instead of unbuild

`build.config.ts` is gone; `dist/` is packed by tsdown through `vite.config.ts` and `vp pack`.

The output is deliberately the same: `src/` still mirrors 1:1 into `dist/` (tsdown's
`unbundle`), so the bin shim's paths keep resolving, and declarations still come from
`gen-types`. No change to `main`, `types`, `exports` or the file layout.

Two things worth knowing, since the next package to move will meet them:

- The `rollup.esbuild` block this replaces never did anything — `builder: 'mkdist'` never
  forwards `rollup`, so `target` and `minify` were inert. `target` is set explicitly now;
  minification stays off because `--verbose` prints execution stacks.
- tsdown defaults `fixedExtension` to true for `platform: "node"`, giving `.mjs` — what the
  bin shim wants, but `dts: true` would emit `.d.mts` and miss `./dist/index.d.ts`.
  Declarations stay on `gen-types` for that reason.

Published byte sizes change while the layout does not: rolldown is not a statement-preserving
transpile, so it inlines and drops things — including the `// @ts-check` pragma in the file
built from `src/utils/parseDeclarationFile.js`.

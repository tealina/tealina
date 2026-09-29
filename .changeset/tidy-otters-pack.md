---
"tealina": patch
---

Build with tsdown instead of unbuild

`build.config.ts` is gone; `dist/` is now packed by tsdown, through `vite.config.ts` and
the `vp pack` command that wraps it.

The output is deliberately the same. `src/` still mirrors 1:1 into `dist/` (tsdown's
`unbundle`), so the bin shim's `./dist/utils/catchError.mjs` and
`./dist/commands/index.mjs` keep resolving, and the declarations still come from the
`gen-types` script. No change to `main`, `types`, `exports`, or the file layout.

Two things worth knowing, since the next package to move will meet them:

- The `rollup.esbuild` block this replaces never did anything. `builder: 'mkdist'` hands
  its entry to `mkdist` and never forwards `rollup`, so `target: 'node20'` and
  `minify: true` were inert — `dist/index.mjs` was 304 readable bytes, not minified. The
  replacement is not expected to shrink anything: `target` is set explicitly now, and
  minification is deliberately left off because the CLI's `--verbose` prints execution
  stacks.
- tsdown defaults `fixedExtension` to true when `platform` is `"node"`, which gives
  `.mjs` output. That is what the bin shim wants — but it also means `dts: true` would
  emit `.d.mts` and miss the `./dist/index.d.ts` in `types`. Declarations stay on the
  `gen-types` script for exactly that reason.
- The published byte sizes change while the layout does not. rolldown is not a
  statement-preserving transpile, so it inlines and drops things esbuild's per-file pass
  left alone — including the `// @ts-check` pragma in the file built from
  `src/utils/parseDeclarationFile.js`. Inert (`dist/` is neither shipped in the repo nor
  type-checked), but it will show up in any `dist/` diff.

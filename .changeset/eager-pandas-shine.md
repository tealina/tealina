---
"@tealina/client": minor
---

Drop CommonJS: the package is now ESM-only

`dist/` is built by `vp pack` (tsdown) instead of tsup, and the package declares
`"type": "module"`. No call site changes — every consumer is already ESM, the
create-tealina web templates included, and the one place that reaches the API
record does it with a type-only import. `main` and `exports` keep their existing
`./dist/*.js` paths and all four subpaths still resolve.

The declaration is not a preference, it is what makes the build run at all. Vite
decides a config file's module format by looking for `type: "module"` in the
nearest package.json; without it, `vite.config.ts` was bundled as CJS and its
`vite-plus/pack` import was rewritten to `require('vite-plus/pack')`. That
subpath carries only `types` and `import` conditions — no `require` — so the
build died with `ERR_PACKAGE_PATH_NOT_EXPORTED` before reaching a single source
file.

Two traps worth knowing about, since the next package to move to `vp pack` will
meet them too:

- The same failure hits any package that is not `type: "module"` and whose
  config imports `vite-plus/pack`. It is the subpath that lacks a `require`
  condition, not the package: `vite-plus` itself resolves fine either way.
- tsdown's `fixedExtension` defaults to true when `platform` is `"node"`, so ESM
  output would have been `.mjs`/`.d.mts` and every path in `exports` would have
  pointed at nothing — with no error from the build, only from whoever imported
  it next. It is set to `false` here to keep `.js`/`.d.ts`.

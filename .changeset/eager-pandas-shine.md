---
"@tealina/client": minor
---

Drop CommonJS: the package is now ESM-only

`dist/` is built by `vp pack` (tsdown) instead of tsup, and the package declares
`"type": "module"`. No call site changes — every consumer is already ESM, and the one place
that reaches the API record uses a type-only import. `main` and `exports` keep their
`./dist/*.js` paths and all four subpaths still resolve.

The declaration is not a preference: Vite decides a config file's module format from the
nearest `type: "module"`, so without it `vite.config.ts` was bundled as CJS and its
`vite-plus/pack` import became `require()`. That subpath carries only `types` and `import`
conditions, so the build died with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

Two traps for the next package to move: the failure hits any non-`type: "module"` package
whose config imports `vite-plus/pack` (it is the subpath, not the package); and tsdown's
`fixedExtension` defaults to true for `platform: "node"`, which would emit `.mjs`/`.d.mts`
and leave every `exports` path pointing at nothing, with no build error — it is `false` here.

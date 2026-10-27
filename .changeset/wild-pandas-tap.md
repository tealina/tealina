---
"@tealina/utility-types": patch
"@tealina/doc-types": patch
"@tealina/doc-ui": patch
---

Build with tsdown instead of tsc

These three had no bundler config — `build` ran `tsc` and let `outDir` do the packaging. They
now go through `vp pack` like every other library here, with a `pack` block in a new
package-local `vite.config.ts`.

The artifacts keep their shape: `dist/index.js` plus `dist/index.d.ts`, the same export names,
`main` and `types`. `fixedExtension: false` keeps the `.js` instead of `.mjs`, and `dts: true`
replaces what `tsc` emitted. `utility-types` and `tealina-doc-ui` also lose their
`tsconfig.build.json`, which had nothing left to say: the entry list decides the output.

Two side effects: `doc-types`' `.d.ts` no longer imports `@tealina/utility-types` (tsdown
inlines workspace types, and the package was only a devDependency, so that import could not
resolve for a consumer anyway); and `target` is `node22` now, which plain `tsc` could not
express.

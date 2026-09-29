---
"@tealina/utility-types": patch
"@tealina/doc-types": patch
"@tealina/doc-ui": patch
---

Build with tsdown instead of tsc

These three had no bundler config at all — their `build` ran `tsc` and let the compiler's
`outDir` do the packaging. They now go through `vp pack` like every other library here,
with a `pack` block in a new package-local `vite.config.ts`.

The artifacts keep their shape: `dist/index.js` plus `dist/index.d.ts`, the same export
names, the same `main` and `types`. `fixedExtension: false` is what keeps the `.js` instead
of `.mjs`, and `dts: true` replaces the declarations `tsc` used to emit. `utility-types`
and `tealina-doc-ui` also lose their `tsconfig.build.json`: with `vp pack` the entry list
decides the output, so it had nothing left to say — the one thing in it that was not about
tsc (a `null` check that `getAssetsPath` still resolves `../static` off `import.meta.url`)
was verified after the switch.

Two side effects worth knowing:

- `doc-types`' `.d.ts` no longer contains `import { ExampleItem, DocDataKeys } from
  '@tealina/utility-types'`. tsdown inlines workspace types into the declaration, and here
  that is a fix: the package is only a `devDependency` of this one, so an outside consumer
  never had it installed and the import could not resolve.
- `target` is `node20` now, matching the rest of the repo. Under plain `tsc` there was no
  way to write that: `target` only takes ES versions, which is why these packages were
  stuck on `ES2022`.

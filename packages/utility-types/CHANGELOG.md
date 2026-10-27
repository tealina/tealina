# @tealina/doc-types

## 1.0.1

### Patch Changes

- 0f3fd92: Require Node 22

  `vite-plus-core`'s tsdown calls `Promise.withResolvers`, which Node 20 lacks, so the build
  failed on the floor the packages claimed. `engines.node` is `>=22`, the Node-side `target` is
  `node22`, and `@types/node` is `^22`; CI and `.nvmrc` run the default Node 24.

  Node 20 is no longer supported. Nothing in the published API changed.

- 0f3fd92: Build with tsdown instead of tsc

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

## 1.1.0-beta.0

### Minor Changes

- 3eb862b: #### Features
  - New LiteralObject kind

## 1.0.2

### Patch Changes

- b2e2416: Update READMED.MD

## 1.0.1

### Patch Changes

- a20dfba: fix: Missing build

## 1.0.0

### Major Changes

- 782781b: ### @tealina/doc-types

  ### tealina

  feat: add docTypeVersion prop

  ### create-tealina

  fix(create-tealina): not found index.js

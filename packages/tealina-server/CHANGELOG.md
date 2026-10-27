# @tealina/server

## 1.1.0

### Minor Changes

- 0f3fd92: Generate barrel keys as the logical path, and put the slash back at the router

  The generated `get/index.ts` reads `'health': import('./health.js')` instead of
  `'/health': ...`. `@tealina/server` prepends the slash in `transformToRouteOptions`, so a
  router still receives an absolute url — express refuses one that does not begin with `/`.

  **Upgrade the two together.** `align` regenerates a kind index from the file tree, so running
  it after this release rewrites every key to the new spelling — against an older
  `@tealina/server` the slash then never comes back and every route breaks. Upgrading the
  packages alone rewrites nothing (a barrel keeping `'/health'` still registers `/health`), so a
  project can migrate by running `align` when it is ready.

### Patch Changes

- 0f3fd92: Build with tsdown instead of tsup

  `tsup` cannot build this package under TypeScript 6: it hard-codes `baseUrl: "."` into the
  declaration rollup, which 6.0 rejects outright (TS5101), so the build stopped before writing
  anything. The package is now packed by tsdown, through `vite.config.ts` and `vp pack`.

  The output is deliberately the same: one CommonJS `dist/index.js` plus `dist/index.d.ts`. No
  API, `exports` or entry-path change.

- 0f3fd92: Require Node 22

  `vite-plus-core`'s tsdown calls `Promise.withResolvers`, which Node 20 lacks, so the build
  failed on the floor the packages claimed. `engines.node` is `>=22`, the Node-side `target` is
  `node22`, and `@types/node` is `^22`; CI and `.nvmrc` run the default Node 24.

  Node 20 is no longer supported. Nothing in the published API changed.

- 0f3fd92: Declare Node 22 as the floor

  `@tealina/server` was built with `target: 'es2022'` and is `node22` now, matching the other
  Node-side packages and the `engines.node: ">=22"` they declare. Its output is byte-identical,
  so this states the real floor rather than changing the artifact.

  `@tealina/client` gains the same `engines.node`, and its `target` deliberately stays `es6`: it
  is the browser-side library the web template imports. Its options also move out of
  `tsdown.config.ts` into the `pack` block of its `vite.config.ts`, where every other package
  keeps them. The build is unchanged.

- 0f3fd92: Rename the internal `BasiRouteOption` type to `BasicRouteOption`

  It is not exported — it only names what `transformToRouteOptions` returns — so callers are
  unaffected. It is noted because the name appears in the emitted declarations, so the published
  `.d.ts` text changes.

## 1.0.2

### Patch Changes

- 548b91d: Align changeset record
- fcb8bcc: Align with npm registry version
- 548b91d: Align npm registry version

## 1.0.1

### Patch Changes

- 6577ffb: update patch version

## 1.0.0-beta.1

### Patch Changes

- 71eab6f: Update README

## 1.0.0-beta.0

### Major Changes

- ddeef50: Release first version

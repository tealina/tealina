# @tealina/client

## 2.0.0

### Major Changes

- 0f3fd92: Spell a call-site url without the leading slash

  `req.get('/health')` is now `req.get('health')`. The generated record keys each route by its
  logical path, so the slash was never the caller's to write, and the three spellings agree:
  `req.get('health')`, `req.post.user[':id'].update()`, `TakeBody<'post', 'article'>`.

  The url a `requester` receives still begins with `/`. A leading slash is tolerated at runtime,
  but it is no longer a key of the type: `'/health'` is a compile error.

### Minor Changes

- 0f3fd92: Drop CommonJS: the package is now ESM-only

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

- 0f3fd92: Add a `shape` parameter to all six factories, so a JavaScript caller can name its API record

  `createFetchClient`, `createFetchRPC`, `createAxiosReq`, `createRawAxiosReq`, `createAxiosRPC`
  and `createRawAxiosRPC` take an optional second argument typed `ShapeWitness<T>` — `T |
undefined`, `undefined` at runtime, never read by the factory. TypeScript callers are
  unaffected; a JavaScript caller cannot write a type argument, so `T` had no inference site,
  fell back to `ApiRecordShape`, and the response types silently collapsed to `unknown`.

  ```js
  const req = createFetchClient(
    requester,
    /** @type {ShapeWitness<ApiTypesForClient>} */ (undefined)
  );
  ```

  The cast is required — `const apiShape = undefined` infers `undefined`, so the annotation has
  to sit on the argument. `ShapeWitness` is exported from the package root.

### Patch Changes

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

- Updated dependencies [0f3fd92]
- Updated dependencies [0f3fd92]
  - @tealina/utility-types@1.0.1

## 1.0.3

### Patch Changes

- 548b91d: Align changeset record
- fcb8bcc: Align with npm registry version

## 1.0.2

### Patch Changes

- 6577ffb: fix dependance

## 1.0.1

### Patch Changes

- 6577ffb: update patch version

## 1.0.0-beta.1

### Patch Changes

- 71eab6f: Update README

## 1.0.0-beta.0

### Major Changes

- ddeef50: Release first version

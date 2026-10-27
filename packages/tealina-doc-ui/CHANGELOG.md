# @tealina/doc-ui

## 2.1.0

### Minor Changes

- 0f3fd92: Let the host own the documentation page, one source per mounted version

  `mount` in an api package now publishes only its own document json, at
  `${API_BASE_URL}/_doc/api.json`, and returns a `docSource` — the name, base URL and json URL
  the page needs. The `server` package owns the single page: `src/doc.ts` collects the sources
  from every mounted version, renders `assembleHTML` once, and serves the page and its assets
  under `/api-doc`. Adding `api-v2` therefore adds a selector entry instead of competing for
  the page's prefix.

  `version.js` no longer carries `VDOC_BASENAME`: `API_VERSION` names the version and
  `API_BASE_URL` derives from it. `@tealina/doc-ui` exports the `TealinaVdocSource` type, so a
  version package can type what it returns without importing the page configuration.

### Patch Changes

- 0f3fd92: Read and show a route by its logical path

  A doc keys each route the way the generated barrel does, with no leading slash. The detail
  header joins `baseURL` and the path with a slash of its own rather than concatenating, so the
  displayed url is unchanged; `openApi2apiDoc` strips the slash from a spec's path, so a
  document that went through `convertToOpenApiJson` keeps the key it went in with.

- 0f3fd92: Fix two ways the playground panel could show nothing instead of the error

  A request that never reached the server — server not started, CORS refused, connection
  dropped — left the panel exactly as it was. The rejection handler built the `Client Side
Error:` object and returned it, but only the fulfilled branch of the `.then` was wired to the
  panel updater, so the object settled a promise nobody read. Both branches go through it now,
  custom request handlers included.

  An error response with an empty body rendered as a blank box: `await response.text()`
  resolves `''` rather than `null`, so `msg ?? response.statusText` never fell through. It is
  `||` now, in the playground, the login page and the API document fetch alike.

- 0f3fd92: Require Node 22

  `vite-plus-core`'s tsdown calls `Promise.withResolvers`, which Node 20 lacks, so the build
  failed on the floor the packages claimed. `engines.node` is `>=22`, the Node-side `target` is
  `node22`, and `@types/node` is `^22`; CI and `.nvmrc` run the default Node 24.

  Node 20 is no longer supported. Nothing in the published API changed.

- 0f3fd92: Rebuild the document page on the current majors of jotai, kbar and the syntax highlighter

  The page is a self-contained bundle, so these move inside it rather than in the app that
  embeds it. What an app sees change is the page itself: kbar's search palette is now the
  released 1.0 instead of the old beta, and jotai, react-syntax-highlighter and the test-only
  jsdom are up to date.

- 0f3fd92: Build the document page against React 19 and antd 6

  The page is a self-contained bundle — React and antd are compiled into it rather than taken
  from the host application — so both move without asking anything of the app that embeds it.
  What that app sees change is the page itself: antd 6 restyles a number of controls, and the
  bundle now carries React 19 instead of 18.

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

- Updated dependencies [0f3fd92]
- Updated dependencies [0f3fd92]
  - @tealina/doc-types@1.1.0

## 2.0.1

### Patch Changes

- 23f45fb: Fix Bugs

  1. Commond field not initialized
  2. Playgroud JSON result haven't format by default

  Styles changed

  1. Remove fixed layout

## 2.0.0-beta.1

### Patch Changes

- 71eab6f: Update README

## 2.0.0-beta.0

### Major Changes

- 89da024: #### Features

  - Support specify any custom basename.
  - Support render Open API
  - Support render markdown format comment
  - Support custom request handler

  ### Refactors

  - Use react-syntax-highlighter and react-simple-code-editor instead monaco-editor, reduced 60% build output.

### Patch Changes

- Updated dependencies [3eb862b]
  - @tealina/doc-types@1.1.0-beta.0

## 1.0.5

### Patch Changes

- 1a00f7f: fix: Invalid initial value

## 1.0.4

### Patch Changes

- dc084cc: fix: Value undefined when has Switch in Form.Item

## 1.0.3

### Patch Changes

- 47cbc2d: fix: Literal initial value lossed while switch tuple types

## 1.0.2

### Patch Changes

- 3b09a66: fix: avoid null value after clean input

## 1.0.1

### Patch Changes

- b2e2416: Update READMED.MD
- Updated dependencies [b2e2416]
  - @tealina/doc-types@1.0.2

## 1.0.0

### Major Changes

- 1cc68d7: release: First major version

## 0.0.5

### Patch Changes

- a20dfba: fix: Missing build
- Updated dependencies [a20dfba]
  - @tealina/doc-types@1.0.1

## 0.0.4

### Patch Changes

- Updated dependencies [782781b]
  - @tealina/doc-types@1.0.0

## 0.0.3

### Patch Changes

- e2e5ebf: ### create-tealina

  - update templates

  ### tealina

  - fix: gpure type UpdateInput not compotibale to prisma when has composite type

  ### @tealina/doc-ui

  - fix: Body section not showing correct content when the type is not object

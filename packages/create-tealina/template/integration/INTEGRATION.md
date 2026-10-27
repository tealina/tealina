# Integrating this scaffold into an existing project

This file was written by `create-tealina --integrate`. It is a one-time playbook for an AI
agent merging this generated project into a repository that already exists. Nothing imports
it, and it can be deleted when the merge is done.

Read all of it before copying a file. The generated project is a working reference, not a
layout the destination has to adopt: in most merges only two of its packages are wanted,
and they are renamed on the way in.

## Read the destination first

Answer these before touching anything. If an answer is unknown, find it — guessing is what
produces a merge that compiles but serves nothing.

1. **Package manager and workspace.** pnpm workspace, npm/yarn workspaces, or one package?
   The generated project is a pnpm workspace; `workspace:*`, the `packages` field and every
   `pnpm -F <pkg>` command below assume that.
2. **Server framework and its major version.** The three templates target `express@5`,
   `fastify@5` and `koa@3`. The copy has to match the destination, because
   `core/types/alias.d.ts` binds that framework's request and response types.
3. **Existing checks.** What runs the type checker and the tests (`tsc`, `vp check`,
   `turbo`, `nx`, ...)? The merge adds packages to that pipeline; it must not add a second
   one.
4. **Server entrypoint.** Where the destination's app is built and where middleware is
   registered, including any catch-all, 404 and static handlers.
5. **Name collisions.** `core`, `api-v1`, `server` and `web` are generic. Check
   `package.json` names and directory names in the destination before choosing.

If the destination does not run Express, Fastify or Koa, stop and report that. Tealina's
runtime registers routes on one of those three; supporting another framework is a new
`alias.d.ts` and access module, not a mechanical merge.

## What the generated project contains

| Path | What it owns |
| --- | --- |
| `backend/core` | Contract layer: `types/handler.d.ts`, `types/common.d.ts`, the framework binding in `types/alias.d.ts`, and `src/access/` (`openApi`, `authedApi`, the guard). No routes. |
| `backend/api-v1` | One API version: `src/api/` (one file per endpoint), `src/router.ts`, `src/doc.ts`, `src/mount.ts`, `version.js`, `tealina.config.ts`, and the public contract entry `types/api.d.ts`. |
| `backend/server` | Host glue: `app.ts`, the documentation page, static assets, env loading, the entrypoint. Holds no routes. |
| `packages/web` | Optional Vite frontend that reads the API types. |

Dependency direction is one way: `core -> api-v1 -> server`. Nothing may point back.

Pick one of two shapes:

- **A. Mount into an existing server.** Copy `backend/core` and `backend/api-v1` only. The
  destination keeps its own `app`, entrypoint, port, static files and deployment. Use this
  whenever the destination already listens for HTTP.
- **B. Merge the whole backend.** Copy all three backend packages. Use this when the
  destination is a monorepo and the generated backend can live beside its other
  applications. `backend/server` is then the host, or the destination's existing entrypoint
  takes over its `app.ts` role.

`packages/web` is independent of both. Copy it only if the destination wants this exact
frontend; an existing frontend integrates through `import type { ApiTypesForClient } from
'<api>/api'` instead.

## Rename the packages on the way in

Do this before wiring anything. It is cheaper than discovering halfway that the
destination already had a package called `core`.

Choose names, for example `@acme/api-core` and `@acme/api-v1`. Then update every place
below. The type checker catches most misses; the string literals in `tealina.config.ts`
are the ones it cannot see.

1. `package.json` in each copied package: `name`, and the dependency keys that point at a
   sibling (`"core": "workspace:*"`, `"api-v1": "workspace:*"`).
2. Every bare import in the copied tree:
   - `core/handler`, `core/common`, `core/access`
   - `api-v1/api`, `api-v1/mount`, `api-v1/version`
3. `tealina.config.ts`: `handlerImport` (the handler types' package) and `typesDir`.
4. The same file's `generateTsCode` / `generateJsCode` string literals. They are the stubs
   `create` writes later, so a rename that misses them produces broken handlers from the
   next command on, with nothing failing in between.
5. `api-v1/types/api.d.ts`: its `from '<core>/handler'` import.
6. A frontend's `devDependencies` key and both imports in its client file.

Useful search, from the destination root:

```bash
grep -rn --include='*.ts' --include='*.js' --include='*.json' \
  -e "'core" -e "'api-v1" -e '"core"' -e '"api-v1"' \
  <copied-dirs>
```

That catches imports, the `handlerImport` value, generator stub literals and the
`workspace:*` dependency keys in one pass. Review each hit: the names also occur in
comments and descriptions, which are not references to the package.

Run `align` after the rename (see [Generate and verify](#generate-and-verify)): the
generated barrels are level-relative and do not carry the package names, but the handler
files they import do.

Keep these names fixed. They are public artifacts and do not follow a directory or package
rename:

- `types/api.d.ts` — the file the package exports as `./api`.
- `exports["./api"]` — the subpath a frontend imports.
- `apiDir` — still the place the route tree is read from.

## Shape A: mount into an existing server

### 1. Copy two packages

Copy `backend/core` and `backend/api-v1` into the destination, for example to
`backend/api-core` and `backend/api-v1`. Go through the rename section above.

Do not copy `backend/server`. Copy pieces of it only if wanted:

- `src/doc.ts` — the HTML documentation page. Needs `@tealina/doc-ui`; Fastify's version
  additionally needs `@fastify/static`, Koa's `@koa/router`, `koa-mount` and `koa-static`.
- `src/routes/static/assets.ts` and `public/` — the scaffold's static home page. Drop both
  if the destination already serves a site.
- `src/config/env.ts` — only the scaffold's own `PORT`/`.env` loading.

### 2. Register the workspace

Add the copied directories to the destination's workspace globs. If it is not a pnpm
workspace, translate `workspace:*` to the manager's spelling and every `pnpm -F <pkg>`
below to its equivalent — the file layout and import specifiers are what must stay exact.

If you also copy the scaffold's `server` dev script, it runs `tsx`, whose `esbuild`
dependency needs its install script to run. On pnpm ≥ 11 the workspace has to allow it:

```yaml
allowBuilds:
  esbuild: true
```

Merge into an existing `allowBuilds` block rather than replacing it. The two library
packages alone do not need it.

### 3. Keep the build step, then mount

`core` publishes `exports["./access"]` with `import` pointing at `./dist/access/index.js`,
and `api-v1` publishes `./mount` the same way. Both packages therefore have to be built
before the host imports them. Keep their `build` scripts, and make the host's start/dev
script build `core` first and `api-v1` second (the scaffold's root `dev` script is the
model). If the destination runs TypeScript directly through `tsx` or a bundler, you may
instead repoint the `import` condition at the `.ts` source; do not repoint `types`.

Mount once, in the destination's app builder, after body parsing needed by the host and
before its catch-all:

```ts
// Express
import { mount } from '<api>/mount'
const source = await mount(app)

// Fastify — await it before fastify.listen() / ready()
import { mount } from '<api>/mount'
const source = await mount(fastify)

// Koa — before any middleware that can answer first
import { mount } from '<api>/mount'
const source = await mount(app)
```

`mount` installs this version's routes under `API_BASE_URL`, serves its document JSON at
`<API_BASE_URL>/_doc/api.json`, and returns a `TealinaVdocSource` for the documentation
page. It also installs its own body parser; the host's duplicate is harmless on Express,
but remove it if the framework objects.

The returned source is only needed by the documentation page. The page is optional:

```ts
import { mountDocs } from './doc.js' // the copied server/src/doc.ts
await mountDocs(app, [source])       // express, koa
await mountDocs(fastify, [source])   // fastify
```

`mountDocs` is the host's job, not the version's. Serving just the JSON is a valid
integration and leaves the page to whatever the destination already has.

### 4. One API prefix

`version.js` is the only place the prefix is written:

```js
export const API_VERSION = 'v1'
export const API_BASE_URL = `/api/${API_VERSION}`
```

`tealina.config`, the mount, the document route, the server log line and the frontend all
read it. Change it there. If the destination already serves `/api`, pick a distinct prefix
(or a distinct version segment) rather than merging two routers on the same prefix.

## Shape B: merge the whole backend

Copy `backend/core`, `backend/api-v1` and `backend/server` into the destination — into
`backend/`, `apps/`, or wherever the destination keeps applications. Then:

1. Add the three directories to the workspace globs and run the rename procedure.
2. **Merge root scripts, do not replace them.** The scaffold's root `package.json` has
   `dev`, `build` and `start`; the destination has its own. Add package-scoped equivalents
   (or namespace the new ones) and keep the prebuild: `core` before `api-v1`, because
   `server` imports `api-v1/mount` from `dist/`.
3. **Merge the workspace config.** Add the new globs, the `esbuild` build allowance, and —
   only if the destination uses Vite+ — the `catalog` and `overrides` entries. A destination
   on another toolchain should drop the Vite+ half and use the packages' `tsc` scripts.
4. **Merge `vite.config.ts` only if Vite+ is already the destination's toolchain.** Its
   `fmt`/`lint` blocks are the scaffold's own style; replacing the destination's config with
   them reformats the whole repository.
5. **Keep each package's tsconfig** (or extend the destination's). The parts that matter:
   `module`/`moduleResolution: NodeNext`, `target: ES2023`, `types: ["node"]`, and include
   patterns covering `types/**/*.d.ts`, `src/**/*.ts`, `*.ts`, `*.d.ts`. The build config
   emits `src/` to `dist/`.
6. **Do not overwrite the destination's `README.md`, `AGENTS.md` or `CLAUDE.md`.** Copy the
   rules that apply — chiefly from `backend/api-v1/AGENTS.md` — into the destination's own
   file. The scaffold's root documents describe the standalone three-package layout and
   will be wrong once it is merged.
7. Node ≥ 22 everywhere the copied packages build or run. `engines` is already declared in
   each package; make CI agree.

The generated `server` is one way to host the two library packages, not the only way.
Replacing its `app.ts` with the destination's existing app builder is Shape A; doing it
while keeping the rest of `server/` is normal.

## Generated files and fixed names

Never merge these by hand — copy them and regenerate:

| Artifact | Owner |
| --- | --- |
| `api-v1/src/api/index.*`, `api-v1/src/api/<method>/index.*` | `align` |
| `api-v1/docs/api.json` | `gdoc` |
| `api-v1/types/api.d.ts` (when `align` cannot find one) | `align` |

Both commands take `--check` (compare only, exit 1 when stale) and `--json` (one object on
stdout, errors on stderr). Wire them into the destination's CI:

```bash
pnpm -F <api> align --check
pnpm -F <api> gdoc --check
```

Facts that hold after any merge:

- A generated file starts with `// @generated by tealina — do not edit.` That header is the
  rule; edit the generator or the handler, then rerun `align`.
- `ApiTypesForDoc` must stay the **first** export in `types/api.d.ts`; the document
  generator finds it by position.
- `exports["./api"]` publishes a `types` condition only. A frontend must
  `import type` from it, never a value import.
- `__@ResponseFlagSymbol` is a string convention matched by regex in the CLI. Renaming it
  compiles and silently degrades document generation.
- `types/alias.d.ts` is the only framework seam. It is copied, not shared; changing the
  destination's framework version means reviewing that file.
- `.js` in an import specifier is how these packages spell `.ts` under NodeNext. Do not
  "fix" it.

## Generate and verify

Run from the destination root, with `<core>` and `<api>` replaced by the names you chose:

```bash
pnpm install

# compile the libraries in dependency order
pnpm -F <core> build
pnpm -F <api> build

# compare generated artifacts; write only if stale
pnpm -F <api> align --check
pnpm -F <api> gdoc --check
# if either exits 1:
pnpm -F <api> align
pnpm -F <api> gdoc

# the destination's own type check / tests
pnpm check        # or: tsc -b, turbo check, nx run-many -t check, ...
```

Then boot the destination and check, in this order:

1. The API answers: `curl -i <API_BASE_URL>/health` (or one endpoint you kept).
2. A guarded endpoint answers `401` without `Authorization` and not-`401` with any value —
   the scaffold's guard is a placeholder; replace `<core>/src/access/verifyToken.ts`.
3. The document JSON loads: `curl <API_BASE_URL>/_doc/api.json`.
4. The documentation page loads, if you mounted it: `/api-doc/index.html`.
5. A frontend (if any) still type-checks against `<api>/api`.

The scaffold's demo handlers (`get/health`, `post/login`, `post/article`) are examples.
Keep them until step 1 passes, then delete what the destination does not need and rerun
`align` and `gdoc`.

## Failure modes that do not throw

These are the merges that look finished and are not:

- **The packages were copied but not built.** `core/access` and `api-v1/mount` resolve to
  `dist/`; a missing `dist` is a runtime `ERR_MODULE_NOT_FOUND`, not a type error, because
  types resolve from source.
- **`handlerImport` or the stub literals still name the old `core`.** Type checking passes;
  the next `create` writes a handler importing a package that no longer exists.
- **A generated barrel was hand-edited.** The next `align` silently drops the edit.
- **`gdoc` was not rerun after a handler changed.** The JSON route serves a stale document
  that still renders, which is why `gdoc --check` belongs in CI.
- **Two routers claim the same prefix.** Requests reach whichever registered first; the
  other's endpoints 404 while both type-check.
- **The destination's framework major differs from the template's.** `alias.d.ts` may still
  compile but describe the wrong `req`/`res`; compare the installed types, not the version
  string in the scaffold's `package.json`.
- **Node < 22.** The copied packages assume it; the failure lands in a dependency's build or
  at runtime, not in this repository's checks.

## Finish

- Delete this file, or move its remaining notes into the destination's contributor docs.
- Record the two new CI steps (`align --check`, `gdoc --check`) where the destination keeps
  its pipeline.
- Leave the dependency direction intact: `core` must not import `api-v1`, and `api-v1` must
  not import the host. A version that reaches for the host stops being a tree.

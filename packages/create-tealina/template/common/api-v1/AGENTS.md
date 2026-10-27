# AGENTS.md

This package owns one api version: each file under `src/api/` **is** a route, and each
handler's type annotation is the single source of truth for the router, the API document,
and the frontend's client types.

The contract layer itself — `OpenHandler`, `AuthedHandler`, and the framework aliases —
lives in the `core` package. The generated stubs import it from `core/handler` and
`core/access`; those specifiers do not change with the depth of the file.

## Rules

- Add an endpoint with the CLI, not by hand: `pnpm run create <method> <path>` from this
  package, or `pnpm -F api-v1 run create <method> <path>` from the workspace root. The
  `run` is required — `pnpm create` is pnpm's own project scaffolder, not this script.
- `src/api/index.*` and `src/api/<method>/index.*` are **generated**. Never edit
  them. After adding, renaming, or deleting a handler, run `pnpm align`.
- `apiDir` and `apiBaseURL` in `tealina.config` say where the route tree is and which URL
  prefix it answers under. The prefix itself lives in `version.js`, which the mount, the
  documentation json route and the frontend also read — change it there, not in one of
  them.
- The public artifacts do not follow the directory's name: `types/api.d.ts` and
  `exports["./api"]` keep those names if the directory moves.
- A handler file's default export is `openApi(handler)` for a public route or
  `authedApi(handler)` for a route that requires an `Authorization` header. A new
  endpoint is private until it says otherwise.
- Annotate the handler's type above the `const`: `OpenHandler<Payload, Response>` or
  `AuthedHandler<Payload, Response>`. Use an `interface` (not an inline object type) for
  a payload shape — the document generator reads the declaration's name.
- A handler kept in `.js` during a migration carries the same type as a JSDoc
  `@type {import('core/handler').OpenHandler<…>}` (or `AuthedHandler<…>`) on its `const`,
  with an `@typedef` above it for the payload shape. The scaffold declares no global
  aliases; add them once in `src/global.d.ts` if you prefer shorter annotations. The
  package needs `allowJs`/`checkJs` and `sourceExt: '.js'` in `tealina.config`; the
  scaffold's README has the full recipe.
- JSDoc comments become API documentation; `//` comments do not.
- A handler file is a thin API boundary: keep validation, database work and transactions in a
  service module (for example `api-v1/src/services`, or `core/src/services` with a `./services`
  export) and call it from the handler. Export `examples` (`MakeExamplesType<ApiType>`) when
  the document should ship request examples.
- Regenerate the API document with `pnpm gdoc` after changing a handler.
- `src/mount`, `src/router` and `src/doc` are this package's host seam. `mount` returns a
  `docSource` describing the json this version publishes; the host collects one source per
  mounted version and owns the page that displays them. `core` must not import these
  files, or the dependency direction stops being a tree.

## Verify

- `pnpm align --check` fails (exit 1) when a generated file is out of date, without
  writing anything. `pnpm gdoc --check` does the same for the API document.
- Add `--json` to either command for a machine-readable `{ ok, changed }` object.
- The type checker is the safety net: a change that breaks the client types fails `tsc`,
  not at runtime.

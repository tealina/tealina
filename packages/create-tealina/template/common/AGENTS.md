# AGENTS.md

This project uses tealina. The directory tree under `src/api/v1/` **is** the route table,
and each handler's type annotation is the single source of truth for the router, the API
document, and the frontend's client types.

## Rules

- Add an endpoint with the CLI, not by hand: `pnpm v1 <method> <path>` from this package,
  or `pnpm -F <package-name> v1 <method> <path>` from the workspace root.
- `src/api/v1/index.*` and `src/api/v1/<method>/index.*` are **generated**. Never edit
  them. After adding, renaming, or deleting a handler, run `pnpm align`.
- A handler file's default export is `openApi(handler)` for a public route or
  `authedApi(handler)` for a route that requires an `Authorization` header. A new
  endpoint is private until it says otherwise.
- Annotate the handler's type above the `const`: `OpenHandler<Payload, Response>` or
  `AuthedHandler<Payload, Response>`. Use an `interface` (not an inline object type) for
  a payload shape — the document generator reads the declaration's name.
- JSDoc comments become API documentation; `//` comments do not.
- Regenerate the API document with `pnpm gdoc` after changing a handler.
- Keep the `v1` name. The API directory, `types/v1.d.ts`, `exports["./api/v1"]`,
  `docs/v1.json` and the docs route are all pinned to it.
- `types/handler.d.ts`, `types/alias.d.ts` and `src/access/` are the contract layer.
  Change them only when you mean to change the convention for every handler.

## Verify

- `pnpm align --check` fails (exit 1) when a generated file is out of date, without
  writing anything. `pnpm gdoc --check` does the same for the API document.
- Add `--json` to either command for a machine-readable `{ ok, changed }` object.
- The type checker is the safety net: a change that breaks the client types fails `tsc`,
  not at runtime.

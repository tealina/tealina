# @tealina/doc-ui-src

The React source of [`@tealina/doc-ui`](../tealina-doc-ui). This package is private and
never published; it exists so the documentation page can be developed and tested as an
application, then shipped as static assets inside the public package.

```bash
# one command: the doc-factory API watchers plus this dev server
pnpm dev:ui
```

The page runs at the Vite dev server's URL and proxies `/api-doc` and `/api` to
`http://localhost:8000`, the doc-factory playground. Point it elsewhere with
`DOC_FACTORY_URL`.

## What it builds

```bash
pnpm -F @tealina/doc-ui-src build
```

`vp build --emptyOutDir` writes to `packages/tealina-doc-ui/static/`. That directory is
generated and git-ignored; `@tealina/doc-ui` publishes it and serves it through
`getAssetsPath()`. Do not edit it by hand — change the source here and rebuild.

The build must run before packaging `@tealina/doc-ui`; `assembleHTML` reads
`static/index.html` at runtime and fails if the directory is missing.

## How the page is configured

There is no server in this package. The page reads `window.TEALINA_VDOC_CONFIG`, which
`assembleHTML` injects in production.

During development a Vite plugin fetches the config from
`${DOC_FACTORY_URL}/api-doc/config.json` and injects it into `index.html` before the app
boots, together with any `customScripts`. The page reads the global at module load, so it
does not start without a config: run the doc-factory before opening the dev server.

The relevant pieces:

| Path | Role |
| --- | --- |
| `src/main.tsx` | React root |
| `src/App.tsx` | Theme provider, login gate, error boundary |
| `src/atoms/` | Jotai atoms: config, selected source, theme, auth |
| `src/Home.tsx`, `src/Landing.tsx` | Documentation page and password page |
| `src/components/` | Menu, search, endpoint detail, playground |
| `src/transformer/` | `ApiDoc` and OpenAPI → the rows the page renders |
| `src/global.d.ts` | The `window` globals `@tealina/doc-ui` declares |

## Development

```bash
pnpm -F @tealina/doc-ui-src dev      # Vite dev server only
pnpm -F @tealina/doc-ui-src test     # Vitest, jsdom, Testing Library, msw
pnpm -F @tealina/doc-ui-src lint     # Oxlint
```

`pnpm dev:ui` from the repository root is usually better: it builds `core` and `api-v1`,
then starts their watchers, the doc-factory server and this dev server together, so
handler changes reach the page without a restart.

The playground keeps a handler for every shape the page has to render — unions,
recursive entities, status-coded responses, streams and a file download — plus an
OpenAPI source and a password-protected page. See
[`playground/doc-factory`](../../playground/doc-factory/README.md) for its endpoints and
login details.

## Releasing

The static output is produced by this package but published by `@tealina/doc-ui`. After
changing the UI:

1. `pnpm -F @tealina/doc-ui-src build`
2. bump and publish `@tealina/doc-ui`

Both packages share a version number, and `static/` is listed in the public package's
`files` field.

## Stack

React 19, Ant Design 6, Jotai, UnoCSS, `react-simple-code-editor` +
`react-syntax-highlighter`, `react-markdown`, `minisearch` for search, and `msw` in
tests. No component is published individually — the public surface is the HTML assembled
by `@tealina/doc-ui`.

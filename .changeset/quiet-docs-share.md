---
"create-tealina": major
"@tealina/doc-ui": minor
---

Let the host own the documentation page, one source per mounted version

`mount` in an api package now publishes only its own document json, at
`${API_BASE_URL}/_doc/api.json`, and returns a `docSource` — the name, base URL and json URL
the page needs. The `server` package owns the single page: `src/doc.ts` collects the sources
from every mounted version, renders `assembleHTML` once, and serves the page and its assets
under `/api-doc`. Adding `api-v2` therefore adds a selector entry instead of competing for
the page's prefix.

`version.js` no longer carries `VDOC_BASENAME`: `API_VERSION` names the version and
`API_BASE_URL` derives from it. `@tealina/doc-ui` exports the `TealinaVdocSource` type, so a
version package can type what it returns without importing the page configuration.

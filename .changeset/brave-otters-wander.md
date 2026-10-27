---
"create-tealina": minor
---

Scaffold the api directory as `src/api`

The route tree lives in a package whose name already says the version (`backend/api-v1`), so
the directory no longer repeats it: the route table is `src/api/get/health.ts`. The URL is
unaffected — `API_BASE_URL` in `version.js` still mounts these routes at `/api/v1`.

Everything derived from the name moves with it: the six templates' `create` / `gdoc` /
`align` scripts, every handler's import depth, the README layout tree, and the config's
`generateFn`, which is handed a directory instead of a depth.

**Upgrade `tealina` with this.** The generated stub reads `TemplateContext.fileDir`, which
the previous major does not send, so `align` against an older CLI writes `undefined` in place
of a path. A project already under `src/api-v1` needs no rename, but does need the config
change that major describes.

---
"create-tealina": minor
---

Scaffold the api directory as `src/api`

One directory per HTTP method, one file per endpoint, was already the shape. The directory
no longer repeats the version: the route tree lives in a package whose name already says it
(`backend/api-v1`), so the route table is `src/api/get/health.ts`. The URL is unaffected —
`API_BASE_URL` in `version.js` still mounts these routes at `/api/v1`.

Everything derived from the name moves with it: the six templates' `create` / `gdoc` /
`align` scripts, every handler's import depth, the README's layout tree, and the config's
`generateFn`, which is handed a directory instead of a depth and measures its specifiers
from there.

**Upgrade `tealina` with this.** The templates' generated stub reads
`TemplateContext.fileDir`, which the previous major does not send; scaffold a project and
run `align` against an older CLI and the stub is written with `undefined` in place of a
path. A project already scaffolded under `src/api-v1` needs no rename — nothing in the
scaffold assumes a depth any more — but it does need the config change that major
describes.

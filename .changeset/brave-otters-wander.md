---
"create-tealina": minor
---

Scaffold the api directory as `src/api/v1`

One directory per HTTP method, one file per endpoint, was already the shape; the path said
`api-v1`, which read as one name rather than as a version of `api`. It is now `src/api/v1`,
so the route table is `src/api/v1/get/health.ts` and the three files that were already
called `v1` — `types/v1.d.ts`, `docs/v1.json`, the `exports["./api/v1"]` entry — finally
agree with it.

Everything derived from the name moves with it: the six server templates' `v1` / `gdoc` /
`align` scripts, every handler's import depth, the README's layout tree, and the config's
`generateFn`, which is handed a directory instead of a depth and measures its specifiers
from there.

**Upgrade `tealina` with this.** The templates' generated stub reads
`TemplateContext.fileDir`, which the previous major does not send; scaffold or `init` a
project and run `align` against an older CLI and the stub is written with `undefined` in
place of a path. A project already scaffolded under `src/api-v1` needs no rename — nothing
in the scaffold assumes a depth any more, and its type file and document are named from
whatever its api directory is called — but it does need the config change that major
describes.

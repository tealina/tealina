---
"create-tealina": major
---

Replace the full-kit scaffold with the minimal one

`create-tealina` now generates the minimal scaffold. It is a reduction
of what 2.x generated: no database layer, no Prisma or SQLite, no `shared-types` workspace
package, no `create-vite` React frontend, no bun runtime fork — node only. What remains is
an API server, its contract layer and its documentation generator, which is what the name
was for.

The backend is three workspace packages with one job each: `backend/core` holds the
contract layer and the access module, `backend/api-v1` holds one API version's route tree,
its document and the code that mounts them, and `backend/server` is the host. A second API
version is therefore a new package (`backend/api-v2`) rather than a new folder, and the
dependency direction is a tree: `core → api-v1 → server`.

`--web` adds a minimal Vite frontend in `packages/web` that reads the contract through
`api-v1/api`. A `template-manifest.ts` names every file the scaffold writes instead of
walking directories. The scaffold writes files and stops: `pnpm install` and `api-v1`'s
`gdoc` are printed as the project's first commands, and the document the API doc page
reads exists once they have run.

There is no `init` subcommand. The three-package layout is the unit the convention now
comes in, and installing it into a server you already have is a refactor the CLI cannot do
without guessing at someone else's entry file; point at the scaffold's layout instead.

The database path has no equivalent here. The old scaffold is not part of this repository.
`2.2.6` was its last release; this changelog continues from there.

---
"create-tealina": major
---

Replace the full-kit scaffold with the minimal one

`create-tealina` now generates the minimal scaffold: no database layer, no Prisma or SQLite,
no `shared-types` package, no React frontend, no bun fork — node only. What remains is the
API server, its contract layer and its documentation generator.

The backend is three packages with one job each: `backend/core` holds the contract layer and
the access module, `backend/api-v1` holds one API version's route tree, its document and the
code that mounts them, and `backend/server` is the host. A second version is a new package
(`backend/api-v2`), and the dependency direction is `core → api-v1 → server`.

`--web` adds a minimal Vite frontend in `packages/web` that reads the contract through
`api-v1/api`. A `template-manifest.ts` names every file the scaffold writes. The scaffold
writes files and stops: `pnpm install` and `api-v1`'s `gdoc` are printed as the project's
first commands.

There is no `init` subcommand — installing the layout into a server you already have is a
refactor the CLI cannot do without guessing at someone else's entry file.

The old scaffold is not part of this repository; `2.2.6` was its last release, and this
changelog continues from there.

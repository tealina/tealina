---
"create-tealina": major
---

Replace the full-kit scaffold with the minimal one

`create-tealina` is now the scaffold developed as `create-tealina-lite`. It is a reduction
of what 2.x generated: no database layer, no Prisma or SQLite, no `shared-types` workspace
package, no `create-vite` React frontend, no bun runtime fork — node only. What remains is
an API server, its contract layer and its documentation generator, which is what the name
was for.

Smaller, but not merely smaller. It gains an `init` subcommand that installs the convention
into a server you already have without touching your source: files are only ever added, and
`package.json` is only ever merged into. It gains `--js`, `--web` and `--no-install`, so a
run can be fully non-interactive, and a `template-manifest.ts` that names every file the
scaffold writes instead of walking directories. It runs `gdoc` for you after the install,
so the document the API doc page reads exists the first time you open it.

The database path has no equivalent here. The old scaffold is kept at
`archive/create-tealina` in the repository as a frozen reference — not built, not tested,
not published from there, and a snapshot rather than a branch. `2.2.6` was its last
release; this changelog continues from there.

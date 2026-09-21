# Archive

Retired packages, kept for reference. Nothing here is built, tested, published or
maintained.

## `create-tealina/`

The full-kit `create-tealina` scaffold, snapshotted at version 2.2.5: Prisma + SQLite, a
`shared-types` workspace package, a `create-vite` React frontend, and a node/bun fork.

It was retired by the minimal scaffold that now holds the name and lives in
[`packages/create-tealina`](../packages/create-tealina). That package is a deliberate
reduction of this one — no database layer, no ORM, no `shared-types`, no `create-vite`
frontend, node only — plus an `init` subcommand this one never had.

**The name on the registry is no longer this code.** `create-tealina@2.2.6` was the last
release of this snapshot; `create-tealina@3.0.0` and later are the package in `packages/`.
The `CHANGELOG.md` moved there with the name, since the npm package is one continuous
identity.

### What it is useful for

Reading the pre-3.0 contract layer, and the reasoning behind the divergence notes in the
live template's `types/*.d.ts`.

### Rules

- **Do not run `pnpm install` in here.** pnpm walks up, finds the monorepo's
  `pnpm-workspace.yaml`, and installs the whole repository instead — slowly, and in a way
  that can leave a lockfile CI then rejects. Copy the directory outside the repo first.
- **Do not reformat or "fix" anything.** It is a frozen snapshot, and a diff in here is a
  diff that cannot be reviewed as one. `biome.json` excludes this directory for that
  reason.
- `dist/` and `node_modules/` were removed deliberately, so `node create-tealina/index.js`
  cannot run and cannot be mistaken for a working checkout.

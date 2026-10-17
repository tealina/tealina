---
name: release
description: Add a changeset, sync template versions, verify, and hand off to the publish workflow
---

# Release

Publishing is done by `.github/workflows/publish.yaml` after CI, not from a laptop. This skill
covers the part before that: the changeset, the version sync, and the local verification.

## 1. Write the changeset

Create `.changeset/<two-random-words>.md` by hand:

```md
---
"tealina": minor
"create-tealina": patch
---

One line, imperative. Then a paragraph on what changed and why, if the line is not enough.
```

Package names are the `name` fields in `packages/*/package.json`. Bump rules:

- `major` — an existing generated project would have to change (contract or CLI behavior).
- `minor` — new flag, new command, new capability.
- `patch` — bug fix with no behavior change beyond the fix.

Do not bump `create-tealina` majors casually: its 3.x line is deliberately minimal, and the
version is what tells users which scaffold generation they have.

## 2. Sync template versions

```bash
pnpm up-temp-versions
```

This writes real versions into `template/versionMaps.json` and updates only the workspace
dependencies each template `package.json` already declares. It is part of `pnpm release`, but
running it now makes the diff reviewable. If a new template tree was added, it must be listed in
`TEMP_LIST` in `scripts/update-version-in-template.mjs` or its versions will freeze.

## 3. Verify

```bash
pnpm verify                          # vp run -r build && vp check && vp test
TEALINA_E2E=1 pnpm -F create-tealina test
```

`pnpm verify` builds first: several tests import built `dist/`, and a stale build hides errors.
E2E installs real packages, so it is the only check that exercises the published shape.

## 4. Hand off

`pnpm release` is `changeset version && up-temp-versions && build && changeset publish`. Let the
workflow run it. If you must publish locally, confirm with the user first: it is outward-facing
and effectively irreversible.

## After the release

- `config` in `.changeset` stays; the generated `CHANGELOG.md` files are committed.
- If the release changed the CLI surface, update `packages/tealina/README.md` and the template's
  `AGENTS.md`.

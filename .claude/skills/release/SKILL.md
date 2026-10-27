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

This updates only the workspace dependencies each template `package.json` already declares. It
walks every manifest under `template/{core,api-v1,server}` plus `template/web/package.json`. It
is part of `pnpm release`, but running it now makes the diff reviewable. A new versioned
dependency belongs in one of the `latest*` lists in `scripts/update-version-in-template.mjs`,
and a new template package tree must be added to `TEMPLATE_TREES` there or its versions will
freeze.

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

### Publishing credentials

The workflow uses npm Trusted Publishing (OIDC), not a token. `id-token: write` lets pnpm
exchange the GitHub run identity for a short-lived npm credential; provenance is attached
automatically for a public package from a public repository.

Three things must stay true outside the diff:

- Every publishable manifest carries `repository.url`, and it must match the GitHub URL exactly
  (case included). npm rejects a publish without it with E422.
- Each package on npmjs.com has a trusted publisher entry naming this repository and the exact
  workflow filename `publish.yaml`. Configurations created after 2026-09-03 allow **stage
  publish** by default; plain `npm publish` must be enabled explicitly.
- No `NPM_TOKEN` in the workflow env. Do not add it back.

## After the release

- `config` in `.changeset` stays; the generated `CHANGELOG.md` files are committed.
- If the release changed the CLI surface, update `packages/tealina/README.md` and the template's
  `AGENTS.md`.

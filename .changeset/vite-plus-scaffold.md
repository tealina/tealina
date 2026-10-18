---
"create-tealina": minor
---

Scaffold projects with Vite+ formatting and linting

The generated workspace now installs `vite-plus` and ships a root `vite.config.ts`, so a
fresh project has `pnpm check` (`vp check`) from the first commit: Oxfmt formats, Oxlint
lints, and the type checker runs over the same sources. `pnpm fmt` and `pnpm lint` run one
half alone.

The formatter is configured to the style the template's sources are already written in —
single quotes, no semicolons, an 80-column line — so `pnpm check` is clean before anything
is edited. Generated route barrels are excluded because `align` owns their formatting.

`packages/web` now runs through `vp dev` / `vp build` / `vp preview`; `vite` resolves to
the copy Vite+ bundles through the workspace catalog and override.

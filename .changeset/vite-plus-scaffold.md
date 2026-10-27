---
"create-tealina": minor
---

Scaffold projects with Vite+ formatting and linting

The generated workspace installs `vite-plus` and ships a root `vite.config.ts`, so a fresh
project has `pnpm check` (`vp check`) from the first commit: Oxfmt formats, Oxlint lints, and
the type checker runs over the same sources. `pnpm fmt` and `pnpm lint` run one half alone.

The formatter matches the template's existing style — single quotes, no semicolons, 80
columns — so `pnpm check` is clean before anything is edited; generated route barrels are
excluded because `align` owns their formatting.

`packages/web` runs through `vp dev` / `vp build` / `vp preview`, and `vite` resolves to the
copy Vite+ bundles through the workspace catalog and override.

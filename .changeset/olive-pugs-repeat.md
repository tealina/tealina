---
"tealina": minor
---

Spell `TealinaConfig`, `MatchForOptionalCheck` and `transformType` correctly

Three public names have carried a typo since they were introduced, and are corrected without
breaking an existing config file:

- `TealinaConifg` → **`TealinaConfig`**, which `defineConfig` now takes.
- `MatchForOptionalChcek` → **`MatchForOptionalCheck`**, the type of `gtype.overwrite.isOptional`.
- `gtype.overwrite.transofrmType` → **`transformType`**.

The old type names still resolve and are marked `@deprecated`. `transofrmType` is still read,
but using it now prints a warning naming `transformType`; setting both resolves to
`transformType`.

The internal `getTestHeplerPath` becomes `getTestHelperPath`; deep paths are not in `exports`,
so no alias was kept.

---
"tealina": minor
---

Spell `TealinaConfig`, `MatchForOptionalCheck` and `transformType` correctly

Three public names have carried a typo since they were introduced. They are corrected
without breaking a single existing configuration file:

- `TealinaConifg` → **`TealinaConfig`**, which `defineConfig` now takes.
- `MatchForOptionalChcek` → **`MatchForOptionalCheck`**, the type of `gtype.overwrite.isOptional`.
- `gtype.overwrite.transofrmType` → **`transformType`**.

The old type names still resolve and are marked `@deprecated`, so an upgrade needs no edits.

`transofrmType` is the one that keeps working differently, because it is a property key a
config file actually writes rather than a type name: it is still read, but using it now
prints a warning naming `transformType`. Setting both resolves to `transformType`.

The internal `getTestHeplerPath` is renamed to `getTestHelperPath`. Nothing outside the
package can reach it — deep paths are not in `exports` and carry no declarations — so no
alias was kept for it.

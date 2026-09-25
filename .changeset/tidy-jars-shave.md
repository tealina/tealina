---
"@tealina/server": patch
---

Rename the internal `BasiRouteOption` type to `BasicRouteOption`

It is not exported — it only names what `transformToRouteOptions` returns — so callers are
unaffected. It is worth a line here because the name is visible in the emitted
declarations, so the published `.d.ts` text changes.

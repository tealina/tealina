---
"tealina": minor
"create-tealina": patch
---

Add a `tealina/utility-types` subpath, and let the scaffold take its types from there

`tealina` already depended on `@tealina/utility-types`; it now hands those types to consumers
from a types-only subpath — nothing to import at runtime, and the `exports` entry carries only
a `types` condition.

That lets a generated project drop a dependency: the contract layer (`types/handler.d.ts` and
each framework's `types/alias.d.ts`) imported `@tealina/utility-types` directly, so every
generated `server` package installed it a second time. Those imports name
`tealina/utility-types` now, and the dependency is gone from all six template manifests.

A subpath rather than the main entry on purpose: `tealina`'s root declaration re-exports
`openapi-types` and reaches its own source through extensionless relative imports, which
would tie the scaffold's compile to a build having run.

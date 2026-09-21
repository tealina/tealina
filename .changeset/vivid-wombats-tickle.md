---
"tealina": minor
"create-tealina": patch
---

Add a `tealina/utility-types` subpath, and let the scaffold take its types from there

`tealina` already depended on `@tealina/utility-types`; what it did not do was hand those
types to anyone. It does now, from a types-only subpath — there is nothing to import at
runtime, and the `exports` entry carries a `types` condition and nothing else.

That is what lets a generated project drop a dependency. The scaffold's contract layer
(`types/handler.d.ts` and each framework's `types/alias.d.ts`) imported
`@tealina/utility-types` directly, which meant every generated `server` package installed
`utility-types` a second time to compile what `tealina` was already carrying. Those imports
name `tealina/utility-types` now, and `@tealina/utility-types` is gone from all six
template manifests.

A subpath rather than the main entry on purpose: `tealina`'s root declaration re-exports
`openapi-types` and reaches its own source through extensionless relative imports, so
naming it from a contract file a scaffold compiles would pull that in and tie the
scaffold's compile to a build having run. The subpath is one line with no imports of its
own.

/**
 * The utility types a scaffold's contract layer is built from (`PickTarget`, `MultiTarget`,
 * `Simplify`, `ExtractResponse`, …), re-exported so a generated project installs one package
 * instead of two — `tealina` is already there for the CLI, and it already depends on
 * `@tealina/utility-types`.
 *
 * Type-only on purpose: there is nothing to import at runtime, and the `exports` entry for
 * this subpath carries a `types` condition and nothing else.
 */
export type * from '@tealina/utility-types'

# tealina

## 1.1.2

### Patch Changes

- 0541288: refector: use gtype instead gpure

## 1.1.1

### Patch Changes

- 2465f38: fix: dependencies error

## 1.1.0

### Minor Changes

- 3b09a66: Big Update:

  1. Simplify the CLI input
     - without capi, always pass -t if need alias
     - without dapi, use -d instead
     - without sapi, use -a instead
     - show waring and exit for deprecated input.
  2. Skip dot file when aligning APIs

## 1.0.1

### Patch Changes

- 0be747a: Republish

## 1.0.0

### Major Changes

- b2e2416: Update READMED.MD
- b2e2416: release: First major version

### Patch Changes

- Updated dependencies [b2e2416]
  - @tealina/doc-types@1.0.2

## 1.0.0

### Major Changes

- 1cc68d7: release: First major version

## 0.3.5

### Patch Changes

- a20dfba: fix: Missing build
- Updated dependencies [a20dfba]
  - @tealina/doc-types@1.0.1

## 0.3.4

### Patch Changes

- 782781b: ### @tealina/doc-types

  ### tealina

  feat: add docTypeVersion prop

  ### create-tealina

  fix(create-tealina): not found index.js

- Updated dependencies [782781b]
  - @tealina/doc-types@1.0.0

## 0.3.3

### Patch Changes

- e2e5ebf: ### create-tealina

  - update templates

  ### tealina

  - fix: gpure type UpdateInput not compotibale to prisma when has composite type

  ### @tealina/doc-ui

  - fix: Body section not showing correct content when the type is not object

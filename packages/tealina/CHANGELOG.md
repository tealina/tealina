# tealina

## 2.0.0

### Major Changes

- 3eb862b: #### BREAKING_CHANGE

  - No more auto-append end slash when the route ends with params.
  - The key prop always starts with slash

    ```ts
    // Before:
    export default { "user/:id/": import("user/[id].js") };
    // After:
    export default { "/user/:id": import("user/[id].js") };

    // Before:
    export default { "user/create": import("user/create.js") };
    // After:
    export default { "/user/create": import("user/create.js") };
    ```

  - No more export types from @tealina/doc-type; you should directly add the dependency instead.

  #### Features

  - Support generate Open API
  - Support .ts file as config file

  #### Other Changes

  - Remove deprecated command line options: --api-dir
  - Remove deprecated config options: gpure
  - Expose more configuration options for command gtype.

### Minor Changes

- 7f385ca: Support API examples

### Patch Changes

- 71eab6f: Update README
- Updated dependencies [7f385ca]
- Updated dependencies [3eb862b]
  - @tealina/doc-types@1.1.0
  - @tealina/utility-types@1.1.0

## 2.0.0-beta.1

### Patch Changes

- 71eab6f: Update README

## 2.0.0-beta.0

### Major Changes

- 3eb862b: #### BREAKING_CHANGE

  - No more auto-append end slash when the route ends with params.
  - The key prop always starts with slash

    ```ts
    // Before:
    export default { "user/:id/": import("user/[id].js") };
    // After:
    export default { "/user/:id": import("user/[id].js") };

    // Before:
    export default { "user/create": import("user/create.js") };
    // After:
    export default { "/user/create": import("user/create.js") };
    ```

  - No more export types from @tealina/doc-type; you should directly add the dependency instead.

  #### Features

  - Support generate Open API
  - Support .ts file as config file

  #### Other Changes

  - Remove deprecated command line options: --api-dir
  - Remove deprecated config options: gpure
  - Expose more configuration options for command gtype.

### Patch Changes

- Updated dependencies [3eb862b]
  - @tealina/doc-types@1.1.0-beta.0

## 1.1.3

### Patch Changes

- 86b3513: Fix(gtype): Missing null type for optional field when generate UpdateInput

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

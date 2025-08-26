---
"tealina": major
---
#### BREAKING_CHANGE
  - No more auto-append end slash when the route ends with params.
  - The key prop always starts with slash
```ts
// Before:
export default {'user/:id/': import('user/[id].js')}
// After:
export default {'/user/:id': import('user/[id].js')}

// Before:
export default {'user/create': import('user/create.js')}
// After:
export default {'/user/create': import('user/create.js')}
```
  - No more export types from @tealina/doc-type; you should directly add the dependency instead.



#### Features
  - Support generate Open API
  - Support .ts file as config file

#### Other Changes
  - Remove deprecated command line options: --api-dir
  - Remove deprecated config options: gpure
  - Expose more configuration options for command gtype.

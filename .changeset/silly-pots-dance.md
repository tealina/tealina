---
"@tealina/client": minor
---

Add a `shape` parameter to all six factories, so a JavaScript caller can name its API record

`createFetchClient`, `createFetchRPC`, `createAxiosReq`, `createRawAxiosReq`, `createAxiosRPC`
and `createRawAxiosRPC` take an optional second argument. TypeScript callers pass the shape as a
type argument and are unaffected — the parameter is optional and infers nothing new. A
JavaScript caller has no way to write a type argument, and that was a hole rather than an
inconvenience:

`T` appears only in the return type. With no type argument and no inference site, it fell back
to its constraint, `ApiRecordShape`. The compiler stayed quiet while the client lost its type —
the response became `unknown`, and because `ApiRecordShape`'s endpoints are all-optional rather
than empty, every call also demanded a payload argument it does not have. Nothing failed; the
projection was simply gone.

```js
const req = createFetchClient(
  requester,
  /** @type {ShapeWitness<ApiTypesForClient>} */ (undefined),
)
```

`ShapeWitness<T>` is `T | undefined` and exists only to be read as a type — it is `undefined` at
runtime and the factories never look at it. The cast is required: `const apiShape = undefined`
infers `undefined`, because a `const` is narrowed to its initializer and the JSDoc annotation is
discarded with it. `ShapeWitness` is exported from the package root.

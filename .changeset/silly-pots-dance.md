---
"@tealina/client": minor
---

Add a `shape` parameter to all six factories, so a JavaScript caller can name its API record

`createFetchClient`, `createFetchRPC`, `createAxiosReq`, `createRawAxiosReq`, `createAxiosRPC`
and `createRawAxiosRPC` take an optional second argument typed `ShapeWitness<T>` — `T |
undefined`, `undefined` at runtime, never read by the factory. TypeScript callers are
unaffected; a JavaScript caller cannot write a type argument, so `T` had no inference site,
fell back to `ApiRecordShape`, and the response types silently collapsed to `unknown`.

```js
const req = createFetchClient(
  requester,
  /** @type {ShapeWitness<ApiTypesForClient>} */ (undefined),
)
```

The cast is required — `const apiShape = undefined` infers `undefined`, so the annotation has
to sit on the argument. `ShapeWitness` is exported from the package root.

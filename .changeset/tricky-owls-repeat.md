---
"create-tealina": minor
---

Add JavaScript mode: `--js`, for a project whose sources are ESM JavaScript

The same convention, installed into a project that has no TypeScript toolchain. Sources are
`.js` annotated with JSDoc; the contract still comes from `.d.ts` files — `handler.d.ts` and
`common.d.ts` are shared byte-for-byte with the TypeScript trees, while `alias.d.ts` differs
on purpose (below).

- `create <name> --js` scaffolds a JavaScript project. Without `--template` it also asks, first
  question, so the answer is on the record before anything is written; `--ts` is the default and
  what you get by saying nothing.
- Every package is `"type": "module"`. The server runs on `node` — `dev` is
  `node --watch src/index.js`, `start` is `node src/index.js`, and there is no `tsx`. The
  libraries are consumed from source: `core`'s `exports["./access"]` points at
  `./src/access/index.js`.
- `build` is `tsc --noEmit` in all three packages. `typescript` stays a devDependency
  because it is the checker, not a build step: `tealina` also drives the compiler API to
  read the sources, so `gdoc` cannot start without it.
- `tealina.config.js` replaces `tealina.config.ts` and sets `sourceExt: '.js'`, which is what
  makes `align` write `index.js` and a `.js` handler stub. The three scripts pass it explicitly
  with `--config-path`.

Handlers in a JavaScript tree are annotated with a JSDoc `@type` directly above the `const`:

```js
/** @type {OpenAPI<EmptyObj, { isOk: boolean }>} */
const handler = async (_req, res) => {
  res.send({ isOk: true })
}

export default openApi(handler)
```

`OpenAPI` / `AuthedAPI` / `EmptyObj` are declared as globals in `handler.d.ts`, so the
handler names its contract without importing it. For that annotation to be accepted on an
`async` handler, the JavaScript tree's `types/alias.d.ts` repeats each call signature: a
JSDoc `@type` is checked as the function's own signature rather than as an assignment to it,
and with a single signature `async` is rejected (TS1065). The TypeScript tree keeps one
signature — its handlers are annotated on the declaration, which is not the path that check
reads.

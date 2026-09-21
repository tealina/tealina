---
"create-tealina-lite": patch
---

Name the JavaScript handler types `OpenAPI` / `AuthedAPI`

`types/handler.d.ts` declared them inside a `namespace Tealina`, so a JavaScript handler
wrote `Tealina.Open<…>` / `Tealina.Authed<…>`. The namespace wrapper is gone and the
aliases are plain global type aliases now: the same handler writes `OpenAPI<…>` /
`AuthedAPI<…>`.

The globals themselves stay, and so does everything else about them. They exist because a
`.js` file has no `import type` and `align` writes stubs into directories that did not
exist when the contract file was written, so a generated file has no relative `import(…)`
chain it could spell. Only the extra level of naming went away.

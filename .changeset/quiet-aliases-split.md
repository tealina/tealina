---
"create-tealina": patch
---

Split the framework alias by mode

`types/alias.d.ts` used to repeat each call signature so that a JSDoc `@type` above an
`async` handler would be accepted in a checked `.js` file (TS1065). A TypeScript handler is
annotated on the declaration, so it never goes through that check and never needed the
repetition. `server/<fw>/types/alias.d.ts` now has one signature; the JavaScript tree's
copy, `server/<fw>-js/types/alias.d.ts`, keeps the second one verbatim.

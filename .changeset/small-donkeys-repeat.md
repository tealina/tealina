---
"create-tealina": patch
---

Give `types/handler.d.ts` four sections, ordered by what depends on what

The file had its private machinery interleaved with the names users write — `EmptyObj`
between two private aliases, `HandlerAlias` wedged between `HTTPMethods` and `OpenHandler`. It
now reads top to bottom as a dependency chain: the shapes everything is built on, the handler
declarations, then the projections.

No type changed, and the contract layer still compiles with `skipLibCheck` off and no unused
locals.

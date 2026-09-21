---
"create-tealina": patch
---

Give `types/handler.d.ts` four sections, ordered by what depends on what

The file had its module-private machinery interleaved with the names users write — `EmptyObj`
sat between two private aliases, and `HandlerAlias`, the abstraction the whole file is built
on, was wedged between `HTTPMethods` and `OpenHandler`. It now reads top to bottom as a
dependency chain: the shapes everything is built on, the handler declarations, the
projections, then the globals for the JavaScript tree.

No type changed. This is a move of whole declarations plus four section rules, and the
contract layer still compiles with `skipLibCheck` off and no unused locals.

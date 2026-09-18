---
"tealina": patch
---

Fix: the tsconfig's `compilerOptions` were silently dropped

`gdoc` read the tsconfig and handed the result to `ts.createProgram` as a whole object, so it
landed in the `CompilerOptions` slot where the options themselves belong. TypeScript's guard
against exactly that shape is what hid it: every option the file declared — `allowJs`,
`strict`, `paths`, `target` — was ignored, and the program was always built with defaults. The
file is now parsed with `parseJsonConfigFileContent`, which also resolves `extends`.

That is what made a JavaScript project impossible to document. With no `allowJs`, TypeScript
does not even resolve a `.js` import, so `type RawApis = typeof apis` degraded to `any` and the
document came back **empty** — no error, no `never`, just nothing to look at.

Two consequences worth naming, because both are visible:

- The document is now the same whether or not `strictNullChecks` is on. Reading the declared
  node for a `string | null`, and reporting an optional property as its own type rather than as
  a union with `undefined`, used to depend on the checker having already collapsed the union —
  which only happened with the option off. Projects that had it on see no change.
- A module that resolves but exports no `default` now reports `Export symbol not found`, the
  same as a module that fails to resolve. It used to reach `exportSymbol.declarations` and
  surface as a `TypeError` instead.

Fix: `convention()` looked through parentheses, and now does

A JavaScript module cannot annotate a `const` and keep an `async` function in it — the
annotation is read as the function's own signature, and the alias's call signature does not
return a promise. So the annotation goes on the expression:
`const handler = /** @type {ApiType} */ (async (req, res) => {…})`. That cast is a
`ParenthesizedExpression`, which is neither of the two node kinds the handler lookup accepted,
so every handler in a JavaScript project was reported as `Export default should be a function`.
The lookup now steps inside the parentheses — at the exported call's last argument and at the
declaration's initializer, both — and, when the argument is not a name, says what the fix is:
the cast goes on a `const`, and the function passed to `convention()` must be that const.

For a TypeScript project this is an identity: nothing it writes puts a handler behind
parentheses. The message for the case it does hit — a handler passed inline — is the visible
change.

---
"tealina": patch
---

Fix: the tsconfig's `compilerOptions` were silently dropped

`gdoc` read the tsconfig and handed the whole object to `ts.createProgram`, so it landed in
the `CompilerOptions` slot. TypeScript's guard against that shape hid it: every option —
`allowJs`, `strict`, `paths`, `target` — was ignored and programs were built with defaults.
It is parsed with `parseJsonConfigFileContent` now, which also resolves `extends`.

That is what made a JavaScript project impossible to document: with no `allowJs`, a `.js`
import does not resolve, `type RawApis = typeof apis` degrades to `any`, and the document came
back empty with no error.

Two visible consequences: the document no longer depends on `strictNullChecks` being off; and
a module that resolves but exports no `default` now reports `Export symbol not found` instead
of a `TypeError`.

Fix: `gdoc`'s handler lookup looked through parentheses, and now does

A JavaScript module cannot annotate a `const` holding an `async` function — the annotation is
read as the function's own signature — so the cast goes on the expression:
`const handler = /** @type {ApiType} */ (async (req, res) => {…})`. That is a
`ParenthesizedExpression`, which the lookup did not accept, so every JS handler was reported
as `Export default should be a function`. The lookup steps inside the parentheses now, and
when the argument is not a name, says the fix is to cast a `const` and pass that const. For a
TypeScript project this is an identity.

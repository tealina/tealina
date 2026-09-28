---
"tealina": patch
---

Support TypeScript 6, and bound the peer range to it

`typescript` is now `>=5.6.2 <7` rather than the open `>=5.6.2`. That range was never
read as "any future TypeScript": `gdoc` drives the compiler API directly, and 7.0 is a
native rewrite that does not carry that API. An install left to resolve `latest` — 7.x
as of this release — gets a `gdoc` that dies on `ts.readConfigFile is not a function`,
which is the failure the old range was already producing. Nothing changes for anyone on
5.x or 6.x; for anyone past it, the resolution now fails with a version in the message
instead of a runtime error with no cause.

Two build-side changes go with it:

- `gen-types` passes `--ignoreConfig`, because it hands `tsc` a list of files rather
  than a project and 6.0 rejects that while a `tsconfig.json` sits beside them
  (TS5112). The flag is what the command has always meant, not a way around the check.
- It also pins `--strict false`. 6.0 enables `strict` by default and these declarations
  are published, so the flags describe the output that is already out there rather than
  the compiler's new taste.

One fix comes along with it. `gdoc` read a tsconfig through `ts.readConfigFile` and
passed the path on as given, so a relative one reached `createProgram` as a relative
`configFilePath` beside an absolutely-resolved source directory — an assertion inside
TypeScript that 6.0 trips where 5.x did not. The path is resolved first. Which files
are read does not change.

---
"tealina": patch
---

Support TypeScript 6, and bound the peer range to it

`typescript` is now `>=5.6.2 <7` rather than the open `>=5.6.2`. The old range was never read
as "any future TypeScript": `gdoc` drives the compiler API, and 7.0 is a native rewrite
without it, so an install resolving `latest` gets `ts.readConfigFile is not a function`.
Nothing changes on 5.x or 6.x; past that, resolution now fails with a version in the message
instead of a runtime error.

Two build-side changes go with it:

- `gen-types` passes `--ignoreConfig`, because it hands `tsc` a file list and 6.0 rejects that
  beside a `tsconfig.json` (TS5112) — what the command always meant.
- It pins `--strict false`. 6.0 enables `strict` by default, and these declarations are
  published, so the flags describe the output already out there.

One fix comes along: `gdoc` passed a relative config path to `createProgram` beside an
absolutely-resolved source directory, tripping a TypeScript assertion in 6.0. The path is
resolved first; which files are read does not change.

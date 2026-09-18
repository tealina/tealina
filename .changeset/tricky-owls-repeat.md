---
"create-tealina-lite": minor
---

Add JavaScript mode: `--js`, for a project whose sources are ESM JavaScript

The same convention, installed into a project that has no TypeScript toolchain. Sources are
`.js` annotated with JSDoc; every type still comes from `types/*.d.ts`, unchanged and shared
byte-for-byte with the TypeScript trees.

- `create <name> --js` scaffolds a JavaScript project. Without `--template` it also asks, first
  question, so the answer is on the record before anything is written; `--ts` is the default and
  what you get by saying nothing.
- The generated `package.json` runs on `node` — `dev` is `node --watch src/index.js`, `start` is
  `node src/index.js`, and there is no `tsx`. `typescript` stays, because it is not a build step
  here: `tealina` drives the compiler API to read the sources, so `gdoc` cannot start without it.
- `tealina.config.js` replaces `tealina.config.ts` and sets `sourceExt: '.js'`, which is what
  makes `align` write `index.js` and a `.js` handler stub. The three scripts pass it explicitly
  with `--config-path`.
- `init --js` installs the JavaScript tree around an existing host and leaves the host's files
  alone, as `init` always has. It adds `typescript` to the host's devDependencies for the reason
  above, and `align` / `gdoc` / `v1` carry the `--config-path` that names the JavaScript config.

Installing JavaScript mode over a project that already has the TypeScript install does not
collide — the two trees use different paths — so it is allowed and it warns: they are two copies
of one convention, only one of them is ever loaded, and the one that wins is decided by whether
`node` or `tsx` resolves `import './index.js'`.

Handlers in a JavaScript tree are annotated as
`const handler = /** @type {ApiType} */ (async (req, res) => {…})`, and that is not a style
choice — the cast has to sit on the expression, because an annotation above the declaration is
read as the function's own return type and an `async` arrow cannot satisfy `HandlerAlias`'s
call signature. `types/handler.d.ts` is unchanged either way.

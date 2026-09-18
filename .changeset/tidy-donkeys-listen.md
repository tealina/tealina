---
"tealina": minor
---

Add `sourceExt`, and probe for a `.js` / `.mjs` tealina config

`sourceExt` is the extension tealina gives the files it generates — the index files and the new
handler stub. It defaults to `".ts"`, so an existing project sees no change. Set it to `".js"`
for a project whose sources are JavaScript.

It is deliberately not the same option as `suffix`. That one is what the generated `import`
statements say, and the two are only equal by coincidence: under `moduleResolution: NodeNext` a
TypeScript project writes `import './x.js'` and still names the file `x.ts`. Folding them into
one knob would have renamed `index.ts` to `index.js` in every existing project.

`--config-path` now probes `tealina.config.{ts,js,mjs}` when the caller did not name a file, so a
JavaScript project does not have to keep a `.ts` file — and a TypeScript toolchain for it —
around just to hold its config. An explicit `--config-path` is still honoured exactly as given,
even when it does not exist: the failure then names the file that was asked for.

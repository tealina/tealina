---
"tealina": minor
---

Add `sourceExt`, and probe for a `.js` / `.mjs` tealina config

`sourceExt` is the extension tealina gives the files it generates — the index files and the
new handler stub. It defaults to `".ts"`, so an existing project sees no change; set it to
`".js"` for a JavaScript project. It also reaches `TemplateContext`, so a `generateFn` can
emit a JSDoc stub for a `.js` file, which is what lets the scaffolding template work without a
second template tree.

It is not the same option as `suffix`, which is what generated `import` statements say — under
`moduleResolution: NodeNext` a TypeScript project writes `import './x.js'` and still names
the file `x.ts`. Folding them into one knob would have renamed `index.ts` to `index.js` in
every existing project.

`--config-path` now probes `tealina.config.{ts,js,mjs}` when the caller did not name a file.
An explicit path is still honoured exactly as given, even when it does not exist.

---
"create-tealina": patch
---

TypeScript is the only scaffold language

`--js` and `--ts` are gone, along with the second template tree per framework. There is one
scaffold per framework now, written in TypeScript; passing either removed flag is refused
rather than silently producing a different project.

A project that still keeps handlers in `.js` remains supported, and migrating is gradual:
enable `allowJs` in every backend package's `tsconfig.json` and `tsconfig.build.json` — the
host compiles `api-v1`'s source through its `types` entry — add `checkJs` and `src/**/*.js`
where the handlers live, and set `sourceExt: '.js'` in `tealina.config.ts`. `create` then
writes a JSDoc stub and `align` names its barrels `index.js`, while `.ts` handlers keep
compiling beside them. The package README has the full recipe.

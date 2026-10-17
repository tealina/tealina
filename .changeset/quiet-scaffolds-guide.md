---
"create-tealina": minor
---

Ship an `AGENTS.md` with the scaffold and with `init`

Both entry points now write an `AGENTS.md` into the server package (and, for `create`, a
short one at the workspace root pointing at it). It states what an agent working in a
tealina project cannot infer from the code in front of it: the directory tree is the
route table, `src/api/**/index.*` is generated and must not be edited, `openApi` vs
`authedApi` decides access, payload shapes need a named declaration for the document
generator, and `v1` is a name the whole convention is pinned to.

It also documents the new verification commands: `align --check` and `gdoc --check` fail
without writing, and `--json` makes them report to a program.

Template `index.*` files now carry the generated-file header, so the one rule above is
visible from the file itself.

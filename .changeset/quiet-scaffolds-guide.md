---
"create-tealina": minor
---

Ship an `AGENTS.md` with the scaffold

The scaffold writes an `AGENTS.md` into `backend/api-v1` and a short one at the workspace
root pointing at it. It states what an agent working in a tealina project cannot infer
from the code in front of it: the directory tree is the route table,
`src/api/**/index.*` is generated and must not be edited, `openApi` vs `authedApi` decides
access, payload shapes need a named declaration for the document generator, the contract
lives in the `core` package, and `core` must not import `api-v1`'s mount code.

It also documents the new verification commands: `align --check` and `gdoc --check` fail
without writing, and `--json` makes them report to a program.

Template `index.*` files now carry the generated-file header, so the one rule above is
visible from the file itself.

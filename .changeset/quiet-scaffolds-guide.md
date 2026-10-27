---
"create-tealina": minor
---

Ship an `AGENTS.md` with the scaffold

The scaffold writes an `AGENTS.md` into `backend/api-v1` and a short root one pointing at it.
It states what an agent cannot infer from the code: the directory tree is the route table,
`src/api/**/index.*` is generated and must not be edited, `openApi` vs `authedApi` decides
access, payload shapes need a named declaration for the document generator, the contract
lives in `core`, and `core` must not import `api-v1`'s mount code. It also documents
`align --check`, `gdoc --check` and `--json`.

Template `index.*` files carry the generated-file header, so the first rule is visible from
the file itself.

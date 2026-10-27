---
"create-tealina": patch
---

Require pnpm 12.x in generated projects

The generated `package.json` now declares `engines.pnpm: ">=12 <13"`, and the project ships a
`.nvmrc` defaulting to Node 24. `engines.node` still says `>=22`, so Node 22 remains supported.

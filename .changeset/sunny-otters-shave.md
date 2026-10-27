---
"create-tealina": patch
---

Scaffold against TypeScript 6

Every template's `typescript` moves from `~5.8.3` to `~6.0.3`. This is not incidental: `gdoc`
drives the compiler API, so it is the compiler a generated project is actually checked by.

TypeScript 6 also changes `types` from "load every `@types/*` in scope" to "load nothing
unless named". The two shared configs therefore spell out `"types": ["node"]` —
`src/config/env.ts` reads `process.env` and calls `process.loadEnvFile()`, and without the
entry every generated project fails `pnpm build` with `Cannot find name 'process'`.

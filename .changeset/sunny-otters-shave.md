---
"create-tealina": patch
---

Scaffold against TypeScript 6

Every template's `typescript` moves from `~5.8.3` to `~6.0.3`. The version is not
incidental to what the scaffold produces: `gdoc` drives the compiler API, so this is the
compiler a generated project is actually checked by.

TypeScript 6 also changes what `types` defaults to. It used to mean "load every
`@types/*` package in scope"; it now means "load nothing unless it is named". The three
shared configs — `template/common/tsconfig.json`, `template/common/js/tsconfig.json` and
`template/common/tsconfig.build.json` — therefore spell out `"types": ["node"]`. They
have to: `src/config/env.ts` reads `process.env` and calls `process.loadEnvFile()`, and
without the entry every project this scaffold writes fails its own `pnpm build` with
`Cannot find name 'process'`.

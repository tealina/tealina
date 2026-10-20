---
name: change-contract
description: Change the handler/response contract across utility-types and all three scaffold trees
---

# Change the contract layer

Use this when changing `types/handler.d.ts`, a framework's `types/alias.d.ts`,
`src/access/`, or the response wrappers in `packages/utility-types/index.ts`. Read
`docs/architecture-notes.md` §3 first: several of these couplings fail silently.

## What counts as the contract

```
packages/utility-types/index.ts                          # WithExtra, MultiTarget, PickTarget, …
template/common/core/types/handler.d.ts                  # OpenHandler, AuthedHandler, ExtractApiType
template/common/core/types/common.d.ts                   # AuthedLocals, AuthHeaders, JsonHeaders
template/core/<fw>/types/alias.d.ts                      # per-framework HandlerAliasCore
template/core/<fw>/src/access/index.ts                   # openApi / authedApi
template/common/api-v1/types/api.d.ts                    # ApiTypesForDoc / ApiTypesForClient
```

## Steps

1. Decide whether this is a **contract change** (every generated project continues to type as
   before) or a **convention change** (projects must adapt). A convention change is a major
   changeset for `tealina` and `create-tealina`.
2. Change the shared type first (`utility-types` or `handler.d.ts`), then the per-framework
   seams. Never special-case one framework in shared code; put it in that framework's
   `alias.d.ts` or adapter.
3. Apply the change in **all three trees**. Express's `alias.d.ts` repeats its call signature
   verbatim — this is deliberate, because a JSDoc `@type` on a `.js` handler kept during a
   migration is checked against a single signature and an `async` handler otherwise fails.
   Fastify and koa need no repetition: their return types already admit a promise or `void`.
   Do not "simplify" express's away.
4. If a response wrapper's *name* changes, update the regex in
   `packages/tealina/src/utils/parseDeclarationFile.js` (`__@ResponseFlagSymbol`). Nothing
   fails at compile time if you forget; the document just loses the rich response.
5. Update the templates' barrels and demo handlers if the public shape changed. Run `align`
   mentally: the generated barrel shape must still type-check.
6. Update `docs/architecture.md` and, if the convention changed, the template's
   `packages/create-tealina/template/common/api-v1/AGENTS.md`.
7. Verify:

   ```bash
   vp check
   vp test
   TEALINA_E2E=1 pnpm -F create-tealina test
   ```

   T1 compiles a fixture assembled from the templates (the `core` seam is rebuilt with
   `paths`); T3 builds a real scaffold in all three frameworks.
8. Add a changeset. Use `major` for anything an existing user would have to change, `minor`
   for a new capability, `patch` for a bug fix.

## Do not

- Do not introduce a second physical copy of `handler.d.ts` / `alias.d.ts`.
- Do not change `alias.d.ts` and `handler.d.ts` in ways that only one framework notices.
- Do not rename `__@ResponseFlagSymbol` without the parser change in the same commit.

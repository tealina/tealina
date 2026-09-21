---
"create-tealina": minor
---

Add `--web`: a minimal frontend that reads the server's types instead of restating them

Off by default — the output of `create` without the flag is unchanged, byte for byte. With
it, a Vite project lands in `packages/web` beside the server, with no framework: no React,
no router, no UI library. `init --web` writes the same package beside an existing server.

The whole package is two source files, because what it demonstrates is not a UI, it is the
client:

```ts
import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'server/api/v1'

export const req = createFetchClient<ApiTypesForClient, RequestInit>(requester)
```

One `workspace:*` dependency and one `import type` — the server's `exports["./api/v1"]`
entry is the entire mechanism. No code generation, no `tsconfig` paths, no project
references, no build step. Rename a field in a handler and the frontend stops compiling;
`test/e2e.test.ts` asserts exactly that, install and build included, in both modes.

Two things the flag has to do that are not obvious:

- **The page differs by which command wrote it.** `create --web` scaffolds a server that
  ships `GET /health`, so its page calls that route. `init --web` lands beside a server
  whose route table starts empty — `src/api-v1/**` is demo content `init` deliberately does
  not copy — and a call to a route the contract does not have is a compile error, so the
  page it writes calls nothing. Same destination, two files.
- **The root scripts change shape, and only with the flag.** `dev` / `build` / `start`
  become `pnpm -r …` so they cover both packages. Without `--web` there is one package and
  the scripts stay `pnpm -F server …`.

`init --web` refuses rather than guesses: no `exports["./api/v1"]` in the target and it
prints the snippet to add instead of creating an `exports` map where there was none (which
would seal every other deep import the package allows); a target that is itself a workspace
root, and the sibling `web` would fall outside the workspace it needs to link against;
files already at the destinations, which is the same collision rule the server half uses.
It never edits the workspace root — it prints the `-r` lines for the root scripts.

Both modes get the frontend, `--js` included: `template/web/js` is the same package with
JSDoc in place of type syntax, reaching the API record through `ShapeWitness` rather than a
type argument. `types/**` is untouched and still shared byte-for-byte by all four trees.

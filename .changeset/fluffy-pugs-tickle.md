---
"create-tealina": minor
---

Add `--web`: a minimal frontend that reads the API types instead of restating them

Off by default. With it, a Vite project lands in `packages/web` beside `backend/`, with no
framework: no React, no router, no UI library.

The whole package is two source files, because what it demonstrates is not a UI, it is the
client:

```ts
import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'api-v1/api'

export const req = createFetchClient<ApiTypesForClient, RequestInit>(requester)
```

One `workspace:*` dependency and one `import type` — `api-v1`'s `exports["./api"]` entry is
the entire mechanism. No code generation, no `tsconfig` paths, no project references, no
build step. Rename a field in a handler and the frontend stops compiling;
`test/e2e.test.ts` asserts exactly that, install and build included.

The page calls `GET /health`, because the scaffold's backend ships that route. It is a
placeholder, not an example to keep: what it demonstrates is the typed `req`, not the
markup.

`--web` also adds the package to the workspace, which is why the root scripts are written
as `pnpm -r …` from the start: the same scripts cover three backend packages, and cover
four when the frontend is present.

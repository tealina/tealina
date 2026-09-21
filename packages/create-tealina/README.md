# Create Tealina

The Tealina scaffold: a typed Node API server for Express, Fastify or Koa, where the
**directory layout is the route table** and each **handler's type annotation is the
single source of truth** that the router, the API documentation and the frontend types
are all derived from.

One workspace package, three demo endpoints, and it compiles and serves out of the box.
Add `--web` for a minimal Vite frontend that reads the server's types.

## ⚡ Quick Start

```bash
# Using pnpm
pnpm create tealina my-app

# Using npm
npm create tealina@latest my-app

# Using bun
bun create tealina my-app
```

You will be asked for a project directory and a server framework. The scaffold then
installs dependencies and generates the API document itself — when it finishes:

```bash
cd my-app
pnpm dev
```

- Service: http://localhost:8000
- API documentation: http://localhost:8000/api-doc/index.html

Add `--template express|fastify|koa` to skip the framework prompt, `--js` for the
JavaScript tree, `--no-install` to skip the install and the doc generation (it prints the
two commands instead), and `--web` for the frontend described
[below](#-adding-a-frontend).

Starting from a server you already have, rather than a new one?
[`init`](#-adding-tealina-to-an-existing-project) adds the convention to it in place.

### Requirements

Node ≥ 20.19, and pnpm if you want the scaffold to install for you. Without pnpm it
skips the install and tells you what to run.

## 📦 What You Get

```
my-app/
  package.json          scripts delegate to the server package
  pnpm-workspace.yaml
  packages/server/
    types/              the contract layer
    src/
      api-v1/           get/health.ts, post/login.ts, post/article.ts
      app/              routes, middlewares, static + docs wiring
        middlewares/auth/  openHandler + verifyToken — the whole public/authed decision
      convention.ts     order-preserving handler combinator
    tealina.config.ts   pre-configured
  packages/web/         only with --web
    src/
      main.ts           the page — calls GET /health once
      api/client.ts     `req`, typed from the server's handlers
```

Without `--web` the output is byte-for-byte what it was before the flag existed: the
frontend is the one part of the scaffold that is not written unless you ask.

`POST /article` is the interesting one: it is authenticated and carries both a request
body and a typed response, so it demonstrates the whole path from handler annotation to
frontend type.

Every endpoint requires an `Authorization` header by default. An endpoint makes itself
public where it is written, by carrying the `openHandler` marker in its handler chain —
`convention(openHandler, handler)` instead of `convention(handler)`. The router holds no
list of paths, so a new endpoint is private until you say otherwise.

## 🔌 Adding tealina to an existing project

Already have a server? Install the same convention into it, in place:

```bash
pnpm create tealina init                    # here
pnpm create tealina init packages/api       # or a specific directory
```

It reads that package's `package.json`, works out which framework it uses, and copies the
convention in. That is the contract layer (`types/`), `convention.ts`, the two auth
middlewares, and the routers that wire them together.

**It never touches your source.** Files are only ever added, and `package.json` is only ever
merged into — a dependency, script or key you already have is kept exactly as it is, whatever
version it says. There is no codemod for your entry file, because a codemod that guesses
wrong leaves a trap in someone else's app.

What it does:

| | |
| --- | --- |
| Detects the framework | From `dependencies` + `devDependencies`. One match, no question; none or several, it asks. `--template express\|fastify\|koa` skips the question. |
| Refuses to overwrite | Every destination is checked first. Any collision aborts with the full list and writes nothing; add `--skip-existing` to leave those files alone and install around them. |
| Merges `package.json` | Adds the `@tealina/*` packages you are missing, plus `v1` / `gdoc` / `align` — each only if that name is free. `typescript` and `tsx` are reported, not added: your compiler and your runner are your call. |
| Leaves `exports` alone | `exports["./api/v1"]` is added only to a package that already has an `exports` map. Creating one where there was none would seal every other deep import you allow. |

What it does not do, and why:

- **No entry-file edit.** It prints the three lines to paste instead, wherever your own
  middleware chain ends.
- **No install, no `gdoc`.** The target may be one package of a workspace; installing from
  inside it is the wrong thing to run.
- **No demo endpoints.** `src/api-v1/` starts empty, so no route you did not write is served.
  The first `align` fills in the index.
- **No error or not-found handler.** The scaffold ships neither, so an unknown route and a
  thrown error are answered by the framework's own default — express's `finalhandler`, koa's
  `ctx.onerror`. Shaping those responses is your application's policy, not the convention's.

When it finishes it prints the file list and the mount snippet. Then:

```bash
pnpm install                                    # at your workspace root
# paste the mount snippet into your entry file
pnpm run v1 post/foo && pnpm run align          # your first endpoint
pnpm run gdoc                                   # the document the doc page reads
```

## 🔗 Adding a frontend

```bash
pnpm create tealina my-app --web
pnpm create tealina init packages/api --web    # beside a server you already have
```

You get a Vite project in `packages/web`, with no framework — no React, no router, no UI
library. Two source files, because what it demonstrates is not a UI, it is the client:

```ts
// packages/web/src/api/client.ts
import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'server/api/v1'

export const req = createFetchClient<ApiTypesForClient, RequestInit>(requester)
```

`ApiTypesForClient` is the server's own handlers, projected for a client. It arrives
through the `server` package's `exports["./api/v1"]` entry — one `workspace:*` dependency
and one `import type`, no code generation, no `tsconfig` paths, no project references, no
build step. **Rename a field in a handler and the frontend stops compiling**, which is the
point.

`src/main.ts` calls `GET /health` and renders the result. It is a placeholder: delete it
and write your app in `src/`. `vite.config.ts` proxies `/api` to `localhost:8000`, which
is why no server template sends CORS headers.

The flag is optional in every sense. A project scaffolded without it has no `packages/web`
at all, the root `dev`/`build`/`start` scripts still delegate to the server alone, and
adding a frontend later is a normal package that imports the same types:

```ts
import type { ApiTypesForClient } from 'server/api/v1'
```

`import type` is required — that export carries a `types` condition only.

### `init --web`

Installs the frontend as a sibling package of the target, so `packages/api` gets a
`packages/web` beside it. It refuses in three cases, and each names the fix rather than
guessing at one:

- **No contract to read.** With no `exports["./api/v1"]` in the target's `package.json` it
  writes the server half and skips the frontend, printing the snippet to add — the same
  reason it will not create an `exports` map where there was none.
- **The target is a workspace root.** A `web` beside it would fall outside the workspace
  and could not link to it. Run `init` against the package instead.
- **Files are already there.** Same collision rule as the server half: it lists them and
  writes nothing, unless you pass `--skip-existing`.

`server: workspace:*` is what resolves the types, so a target with no
`pnpm-workspace.yaml` beside it gets the frontend *and* a warning. `init` never edits the
workspace root — it prints the `-r` lines for the root scripts instead.

The page it writes calls nothing: your route table starts empty, and a call to a route the
contract does not have is a compile error. The scaffolded page calls `/health`, because
the scaffold's server ships that route.

## 📖 Learn More

The generated project's `README.md` documents the convention, how to add an endpoint, how
to make one public, and what `--web` wrote. For everything else, visit the
[Tealina Documentation](https://www.tealina.dev).

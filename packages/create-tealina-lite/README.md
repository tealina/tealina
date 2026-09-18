# Create Tealina Lite

The minimal Tealina scaffold: a typed Node API server for Express, Fastify or Koa,
where the **directory layout is the route table** and each **handler's type annotation
is the single source of truth** that the router, the API documentation and the frontend
types are all derived from.

No database, no ORM, no frontend scaffold, no `node`/`bun` fork. One workspace package,
three demo endpoints, and it compiles and serves out of the box.

## ⚡ Quick Start

```bash
# Using pnpm
pnpm create tealina-lite my-app

# Using npm
npm create tealina-lite@latest my-app

# Using bun
bun create tealina-lite my-app
```

You will be asked for a project directory and a server framework. The scaffold then
installs dependencies and generates the API document itself — when it finishes:

```bash
cd my-app
pnpm dev
```

- Service: http://localhost:8000
- API documentation: http://localhost:8000/api-doc/index.html

Add `--template express|fastify|koa` to skip the framework prompt, and `--no-install` to
skip the install and the doc generation (it prints the two commands instead).

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
```

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
pnpm create tealina-lite init                    # here
pnpm create tealina-lite init packages/api       # or a specific directory
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

- **No entry-file edit.** It prints the three lines to paste instead — before your 404 handler.
- **No install, no `gdoc`.** The target may be one package of a workspace; installing from
  inside it is the wrong thing to run.
- **No demo endpoints.** `src/api-v1/` starts empty, so no route you did not write is served.
  The first `align` fills in the index.
- `src/app/middlewares/errorHandler.ts` comes along on express and koa only because
  `verifyToken` imports its formatter. It is **not** wired into your app.

When it finishes it prints the file list and the mount snippet. Then:

```bash
pnpm install                                    # at your workspace root
# paste the mount snippet into your entry file
pnpm run v1 post/foo && pnpm run align          # your first endpoint
pnpm run gdoc                                   # the document the doc page reads
```

## 🔗 Adding a frontend

The server publishes its types through `exports["./api/v1"]`, so a sibling package just
imports them:

```ts
import type { ApiTypesForClient } from 'server/api/v1'
```

`import type` is required — that export carries a `types` condition only. No code
generation, no `tsconfig` paths, no project references, no build step. Changing a
handler's response type then breaks the frontend build, which is the point.

## 🤔 Lite vs. the full kit

|  | `create-tealina` | `create-tealina-lite` |
| --- | --- | --- |
| Workspace packages | 4 (root + server + shared-types + web) | 1 (root + server) |
| Database | Prisma + generated client | — |
| Frontend | `create-vite` + typed client | bring your own; types are ready |
| Runtime | node / bun | node |
| Setup | interactive, several steps | install + generate docs |

The route convention, the contract layer, the generated documentation and the
end-to-end types are identical. If you want the database and the React scaffold, use
[`create-tealina`](https://www.npmjs.com/package/create-tealina) instead.

## 📖 Learn More

The generated project's `README.md` documents the convention, how to add an endpoint, how
to make one public, and how to add a frontend. For everything else, visit the
[Tealina Documentation](https://www.tealina.dev).

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

# Getting Started

Tealina turns a directory tree and a handler's type annotation into routes, client types and API documentation. The scaffold produces a Node API service that compiles and starts as-is, with Express, Fastify and Koa supported.

## Requirements

- **Node ≥ 22**. This is the supported floor for the repository and for generated projects; the default version for both is 24 (see `.nvmrc`).
- **TypeScript 5.6.2 through 6.x**. The CLI reads declaration files through the TypeScript Compiler API. TypeScript 7 is the Go-native rewrite, and the current latest version, 7.0.2, does not provide that API yet, so it is not supported for now. The upper bound will be relaxed once upstream provides it.
- **pnpm 12.x** (for `pnpm install`). The generated `package.json` declares `engines.pnpm`, and `pnpm-workspace.yaml` uses `allowBuilds`, which earlier pnpm versions ignore. The scaffold itself does not install dependencies; it only prints the command for the first run.

The scaffold includes no database layer and does not depend on Prisma.

## Creating a Project

```bash
# pnpm
pnpm create tealina my-app

# npm
npm create tealina@latest my-app

# bun
bun create tealina my-app
```

Next it asks for the project directory and the server framework. The scaffold only writes files: it does not install dependencies and does not run `gdoc`. When it exits, it prints the command for the first run. The documentation page becomes available only after you install dependencies and generate the docs:

```bash
cd my-app
pnpm install
pnpm -F api-v1 gdoc
pnpm dev
```

### Non-interactive Runs

| Flag | Effect |
| --- | --- |
| `--template express\|fastify\|koa` | Skips the framework prompt |
| `--web` | Also generates `packages/web`, a minimal Vite frontend |
| `--integrate` | Writes `INTEGRATION.md` at the project root, an integration playbook for AI assistants |

With both the project name and `--template` given, it asks no questions at all:

```bash
pnpm create tealina my-app --template fastify --web
```

The scaffold only generates TypeScript. If the project still has `.js` handlers, see [JavaScript Handlers](./javascript-handlers.md).

When the target directory is not empty, the scaffold first asks whether to delete it; for a non-interactive run, point it at a new or empty directory.

## Starting the Server

```bash
cd my-app
pnpm dev
```

| Address | Content |
| --- | --- |
| `http://localhost:8000` | API service |
| `http://localhost:8000/api-doc/index.html` | API documentation and playground |
| `http://localhost:5173` | Frontend, present only with `--web` |

The port comes from `backend/server/.env`. Copy `.env.example` to `.env` and change `PORT`; the frontend proxy target is also set in `packages/web/vite.config.ts`.

## Adding Your First Endpoint

The method name and the file name are the HTTP method and the path:

```bash
pnpm -F api-v1 run create post/user   # writes src/api/post/user.ts
pnpm -F api-v1 align                  # rebuilds the generated index files
pnpm -F api-v1 gdoc                   # regenerates docs/api.json
```

`run` cannot be omitted: `pnpm create` is pnpm's own project scaffold, not the script here.

Open the file just generated and fill in the handler:

```ts
import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'

interface UserPayload {
  name: string
}

type ApiType = AuthedHandler<{ body: UserPayload }, { id: number }>

const handler: ApiType = async (req, res) => {
  res.send({ id: 1 })
}

export default authedApi(handler)
```

A handler only declares the interface contract and calls business logic. Implementation such as databases, validation and transactions belongs in service modules, for example under `backend/core/src/services/`; the handler keeps only reading the request and sending the response. Example values needed by the documentation page can come from the file's `examples` export — see [Handler Contract](./handler-contract.md).

New endpoints require an `Authorization` header by default. To make one public, replace `AuthedHandler` with `OpenHandler` and `authedApi` with `openApi`; see [Authentication](./authentication.md).

## Next Steps

- [Project Structure](./project-structure.md): what each of the three backend packages is responsible for.
- [File-based Routing](./routing.md): the rules for `create`, `delete`, `align` and generated files.
- [Handler Contract](./handler-contract.md): how type annotations drive routes, docs and the client.

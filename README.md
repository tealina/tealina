<p align="center">
<img src="https://github.com/tealina/docs-en/blob/main/docs/public/logov2.svg" height="150">
</p>

<h1 align="center">
Tealina
</h1>
<p align="center">
The Full-Stack Automation Kit: Code Gen CLI, Interactive Docs & Type-Safe Client
<p align="center">
No Framework Left Behind: Seamless E2E Types for Express, Fastify, and Koa with Minimal Changes.
</p>

<p align="center">
<a href="https://github.com/tealina/tealina/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg"></a> 
<a href="https://www.npmjs.com/package/tealina"><img src="https://img.shields.io/npm/v/tealina.svg?style=flat&color=289758"></a> 
<a href="https://github.com/tealina/tealina/actions"><img src="https://github.com/tealina/tealina/workflows/CI/badge.svg"></a> 
<a href="https://github.com/tealina/tealina/blob/main/.github/CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a> 
</p>

<p align="center">
 <a href="https://tealina.dev">Documentation</a> | <a href="https://tealina.dev/guide/">Getting Started</a> | <a href="https://tealina.dev/why">Why Tealina?</a>
</p>
<p align="center">
<a href="https://cn.tealina.dev">中文文档</a> |
<a href="https://github.com/tealina/tealina/tree/main/docs">中文文档源（仓库内）</a>
</p>

<h4 align="center">

</h4>
<br>
<br>

## Getting Started

```bash
pnpm create tealina my-app
```

You will be asked for a project directory and a server framework. The result is a typed API
server for Express, Fastify or Koa, where each handler file is a route and each handler's
annotation is the single source of truth that the router, the API documentation and the
frontend types are derived from. `--web` adds a minimal Vite frontend that reads
those types rather than restating them.

`--template express|fastify|koa` makes a run fully non-interactive; the tutorial continues in
[the scaffold's README](./packages/create-tealina/README.md).

The backend is three workspace packages — `core` (the contract layer), `api-v1` (one API
version and its docs) and `server` (the host) — so a second API version is a new package
rather than a new folder.

## For AI assistants

- A generated project ships `backend/api-v1/AGENTS.md` (and a root one pointing at it). It
  states the rules that are easy to get wrong: each file under `src/api/` is a route,
  `src/api/**/index.*` is generated, `openApi` vs `authedApi` decides access,
  and payload shapes need a named declaration. Read it before editing endpoints.
- This repository's own instructions are in [AGENTS.md](./AGENTS.md).
- `pnpm -F api-v1 align --check` and `pnpm -F api-v1 gdoc --check` exit 1 when generated
  output is stale without writing anything. Add `--json` for a single `{ ok, changed }`
  object on stdout (errors go to stderr).
- [llms.txt](./llms.txt) lists the entry points in the format agents expect.
- Node ≥ 22 is required.

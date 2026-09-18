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
<a href="https://cn.tealina.dev">中文文档</a>
</p>

<h4 align="center">

</h4>
<br>
<br>

## Getting Started

```bash
# The full kit: API + database (Prisma) + a React frontend wired to it
pnpm create tealina my-app

# The minimal one: just the typed server, three workspace packages lighter
pnpm create tealina-lite my-app
```

Both generate the same route convention, the same generated API documentation and the
same end-to-end types. `create-tealina-lite` drops the database layer, the frontend
scaffold and the node/bun split — see
[its README](./packages/create-tealina-lite/README.md) for the trade-off.

---
"create-tealina": minor
---

`--integrate` writes an AI merge playbook

`pnpm create tealina my-app --integrate` writes `INTEGRATION.md` at the project root: a
one-time guide for an agent merging the scaffold into an existing repository. It is not
written otherwise.

The playbook covers copying only `core` and `api-v1` and mounting them on the destination's
own Express/Fastify/Koa app, or moving all three backend packages into an existing monorepo.
It names what the copied code cannot tell an agent: the `handlerImport` and generator-stub
literals that carry package names (miss them and the next `create` writes a broken import),
why `core` and `api-v1` must be built before the host imports `dist/`, why `src/api/**/index.*`
and `docs/api.json` are regenerated rather than merged, and how to verify with `align --check`
and `gdoc --check`.

The Chinese guide is at `/guide/integration`, and the CLI reference lists the flag.

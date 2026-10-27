---
"create-tealina": minor
---

`--integrate` writes an AI merge playbook

`pnpm create tealina my-app --integrate` writes `INTEGRATION.md` at the project root. It
is a one-time guide for an agent merging the scaffold into a repository that already
exists, and it is not copied — or imported — otherwise.

The playbook covers the two shapes a merge takes: copying only `core` and `api-v1` and
mounting them on the destination's own Express/Fastify/Koa app, or moving all three backend
packages into an existing monorepo. It also names what the copied code cannot tell an
agent: the `handlerImport` and generator-stub literals that carry package names (miss them
and the next `create` writes a broken import), why `core` and `api-v1` must be built before
the host imports `dist/`, why `src/api/**/index.*` and `docs/api.json` are regenerated
rather than merged, and how to verify the result with `align --check` and `gdoc --check`.

The generated project's `INTEGRATION.md` is the English, agent-facing copy. The Chinese
guide is at `/guide/integration`, and the CLI reference lists the flag.

# AI Assistants

Tealina's conventions are the same for people and for AI, but a few rules are easy to overlook, so generated projects ship instruction files alongside the code.

## The Shipped `AGENTS.md`

The scaffold writes two:

- `AGENTS.md` (project root): package responsibilities, dependency direction, common scripts.
- `backend/api-v1/AGENTS.md`: the rules you must know before editing endpoints.

The core of the second file:

- Add endpoints with the CLI, never by hand: run `pnpm run create <method> <path>` inside `api-v1`, or `pnpm -F api-v1 run create <method> <path>` at the repository root. `run` cannot be omitted.
- `src/api/index.*` and `src/api/<method>/index.*` are generated artifacts; never edit them. After adding, removing or changing a handler, run `pnpm align`.
- `apiDir` and `apiBaseURL` come from `tealina.config`; the prefix itself lives in `version.js`.
- Public artifact names are fixed: `types/api.d.ts` and `exports["./api"]` do not change when directories are renamed.
- Files export `openApi(handler)` or `authedApi(handler)` by default; new endpoints are private by default.
- Type annotations go on the `const`; payloads use `interface`; JSDoc becomes documentation, `//` does not.
- After changing a handler, run `pnpm gdoc`.
- `src/mount`, `src/router` and `src/doc` are the package's interface to the host; `core` must not import them in the opposite direction.

Have the assistant read this file before changing any endpoint. The repository's own `AGENTS.md` describes the maintenance rules of this repo; do not mix the two up.

## `--integrate`: Merging a Generated Project into an Existing Repository

```bash
pnpm create tealina my-app --integrate
```

An extra `INTEGRATION.md` appears at the project root, written for the AI assistant performing the merge. It plays no part at runtime and can be deleted once the merge is complete. Its content follows the order "read the target repository first → choose a shape → copy → rename → merge workspace/scripts → install and generate → wire up → verify", covering two shapes:

- Mount only `core` + `api-v1` onto an existing Express/Fastify/Koa instance, keeping the target repository's own server;
- Merge all three backend packages into the existing monorepo.

The playbook deliberately calls out the pitfalls that type checking cannot see: the strings for `handlerImport` and the generator stubs in `tealina.config.ts`, the need to build `core`/`api-v1` first, the fact that `src/api/**/index.*` and `docs/api.json` can only be regenerated, and how both sides behave when their routes occupy the same prefix. Have the assistant start from this file; do not just give it a directory tree.

A human-readable version is at [Integrating into an Existing Project](./integration.md).

## Commands for Automation

```bash
pnpm -F api-v1 align --check
pnpm -F api-v1 gdoc --check
```

Both commands compare only and write no files; they exit with code 1 when a generated artifact is stale. With `--json`, standard output contains a single object:

```json
{ "ok": false, "changed": [{ "action": "update", "file": "src/api/get/index.ts" }] }
```

Error messages always go to standard error, so standard output can be parsed directly. These commands fit into CI, pre-commit hooks or agent loops.

## This Repository's `llms.txt`

The `llms.txt` at the repository root lists the entry points the way LLMs expect them: README, scaffold instructions, architecture docs and each package README. It points to documentation source files, not site URLs.

## Environment

Node ≥ 22 is a hard requirement. The type checker is the last safety net: a change that breaks client types or the documentation projection fails `tsc` instead of surfacing only at runtime.

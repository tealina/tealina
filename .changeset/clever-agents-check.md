---
"tealina": minor
---

Make the CLI's result machine-readable

Three changes for callers that are programs rather than people:

- `align` and `gdoc` accept `--check`: the same snapshot calculation, writes nothing, exits 1
  when a generated file is out of date.
- Both accept `--json`, which prints one object on stdout and nothing else: `{ ok: true,
  changed: [{ action, file }] }` for a normal run, `{ ok: false, changed: [...] }` for drift
  (or `{ ok: true, changed: [] }` when there is none). Errors go to stderr as `{ ok: false,
  error: { message } }`; `--verbose` adds the stack.
- Every error path now exits 1. Previously a failed `align` looked successful to a script.

Generated files start with a two-line header naming the command that rebuilds them. The
fallback `types/<api-dir>.d.ts` now exports `ApiTypesForDoc` and `ApiTypesForClient`; it
referenced `ResolveApiType` / `ApiTypesRecord`, which do not exist, so it did not type-check
and `gdoc` could not read it. `cli.version()` reads `package.json` instead of a hard-coded
string.

`--check` also exposed a bug: `parseDeclarationFile` kept its ref tables between calls, keyed
by per-program type ids, so a second `gdoc` in one process could render a different document
than the first. The tables are reset per call now.

---
"tealina": minor
---

Make the CLI's result machine-readable

Three changes for callers that are programs rather than people:

- `align` and `gdoc` accept `--check`. It runs the same snapshot calculation as a normal
  run, writes nothing, and exits 1 when a generated file is out of date. A CI job can now
  fail on drift instead of regenerating and committing.
- Both commands accept `--json`, which prints one object on stdout and nothing else: a
  normal run reports what it wrote as `{ ok: true, changed: [{ action, file }] }`, and
  `--check` reports drift as `{ ok: false, changed: [...] }` (or `{ ok: true, changed: [] }`
  when there is none). Errors go to stderr as `{ ok: false, error: { message } }`;
  `--verbose` adds the stack.
- Every error path now sets the exit code to 1. Previously the CLI printed the error and
  exited 0, so a failed `align` looked like a successful one to a script.

Generated files also start with a two-line header naming the command that rebuilds them,
so a reader can tell generated output from source.

The fallback `types/<api-dir>.d.ts` written when `align` cannot find one now exports
`ApiTypesForDoc` and `ApiTypesForClient`, the same names the template uses. It previously
referenced `ResolveApiType` / `ApiTypesRecord`, neither of which exists in
`types/handler.d.ts`, so the generated file did not type-check and `gdoc` could not read it.

`cli.version()` now reads `package.json` instead of holding a hard-coded string.

`--check` also exposed a repeatability bug: `parseDeclarationFile` kept its ref tables
between calls, and they are keyed by TypeScript's per-program type ids. A second `gdoc` in
the same process could therefore render a different document than the first. The tables are
now reset per call, so two runs on the same input produce the same bytes.

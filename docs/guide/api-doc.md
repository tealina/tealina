# API Documentation

`tealina gdoc` reads `types/api.d.ts` and generates `docs/api.json` by following the handler types. The documentation page is served by the host; each API version publishes only its own JSON file.

```bash
pnpm -F api-v1 gdoc          # regenerate docs/api.json
pnpm -F api-v1 gdoc --check  # compare only; exit code 1 when stale
```

`gdoc` reads the **first exported type** in `types/api.d.ts`, so `ApiTypesForDoc` must stay first and `ApiTypesForClient` must come after it. If the order is wrong, the documentation reads the wrong type or fails.

## Generated Artifacts

- The default output directory is `docs`, and the file is `docs/api.json`.
- `-o / --output <dir>` changes the output directory.
- Do not edit the generated JSON file by hand; rerun `gdoc` after changing handlers.
- The documentation page reads the JSON file from disk. If the page reports a missing file, run `gdoc` once first.

## The Documentation Page

Each API version exports a `docSource` from its own `src/doc.ts`:

```ts
import type { TealinaVdocSource } from '@tealina/doc-ui'
import { API_BASE_URL, API_VERSION } from '../version.js'

export const docSource: TealinaVdocSource = {
  name: API_VERSION,
  baseURL: API_BASE_URL,
  jsonURL: `${API_BASE_URL}/_doc/api.json`,
}
```

- `name` is the label in the version selector; two versions cannot share a name.
- `baseURL` is the prefix the playground uses when sending requests.
- `jsonURL` is the address of the documentation JSON file; in the scaffold it is `/api/v1/_doc/api.json`.

`src/mount.ts` registers the documentation JSON file at `jsonURL` and returns `docSource`. The host's `server/src/doc.ts` collects the sources of all versions and uses `assembleHTML` from `@tealina/doc-ui` to generate a single page:

```ts
const v1 = await mount(app)
await mountDocs(app, [v1])
```

The page address is `/api-doc/index.html`, and the same build result is reused for every request. When you add `api-v2`, add the `docSource` it returns to the array and the page shows a second version; no separate page is needed.

## Custom Outputs

`gdoc.customOutputs` receives the complete `ApiDoc` and the config:

```ts
import { convertToOpenApiJson } from 'tealina'

export default defineConfig({
  // ...
  gdoc: {
    customOutputs: [
      (apiDoc, { baseURL }) => ({
        content: JSON.stringify(convertToOpenApiJson(apiDoc, baseURL)),
        filePath: 'docs/openapi.json',
      }),
    ],
  },
})
```

Once `customOutputs` is set, the default `docs/api.json` is no longer written. To keep both, add:

```ts
gdoc: {
  keepOriginalOutput: true,
  customOutputs: [/* ... */],
}
```

`GdocContext` provides `outputDir`, `apiDir` and `baseURL`; `baseURL` is the `apiBaseURL` from `tealina.config.ts`.

## The Documentation Data Model

The shape of `docs/api.json` is defined by `@tealina/doc-types`: endpoints are grouped by method under `apis`, and shared or recursive types live in three tables keyed by numeric id — `entityRefs`, `enumRefs` and `tupleRefs` — to avoid infinite expansion.

Fields in the documentation come from the handler's JSDoc: `/** ... */` is kept, `// ...` is not. Declare payloads with `interface`; otherwise the type name is lost and the type is expanded inline. A handler file can also export `examples`, which provide the examples shown on the documentation page for `body`, `query`, `params`, `headers` and `response`; `gdoc` writes these values into `docs/api.json` as well. Both documentation sources are described in detail in [Handler Contract](./handler-contract.md).

## Checking in CI

```bash
pnpm -F api-v1 align --check --json
pnpm -F api-v1 gdoc --check --json
```

Neither command writes files, and both exit with code 1 when a generated artifact is stale. `--json` writes an object to standard output:

```json
{ "ok": false, "changed": [{ "action": "update", "file": "docs/api.json" }] }
```

Error messages go to standard error, so standard output can be handed safely to other tools for parsing.

## Related

- [@tealina/doc-types](/reference/doc-types.md): `ApiDoc` and `DocKind`.
- [@tealina/doc-ui](/reference/doc-ui.md): page configuration, multiple versions, password protection and custom requests.
- [tealina CLI](/reference/cli.md): all the parameters of `gdoc`.

# tealina CLI

`tealina` turns a directory tree into a route table, handler annotations into API documentation, and a Prisma schema into pure TypeScript types. Every command is driven by a single config file.

```bash
npm install -D tealina
```

| Command | Purpose |
| --- | --- |
| `create [route]` | Write handler stubs and update barrel files |
| `delete <route>` | Delete a handler and update barrel files |
| `align` | Rebuild all generated barrel files from the files on disk |
| `gdoc` | Generate API documentation from `types/api.d.ts` |
| `gtype` | Generate pure types from a Prisma schema |

Environment requirements: Node ≥ 22; TypeScript `>=5.6.2 <7` as a peer dependency. `gdoc`, `gtype`, and type projections read declaration files through the TypeScript Compiler API. TypeScript 7 is the Go-native rewrite, and the current latest version, 7.0.2, still does not provide that API, so it is not supported yet; the upper bound will be relaxed once upstream provides it.

## Global Options

| Option | Default | Description |
| --- | --- | --- |
| `--config-path <path>` | `./tealina.config.ts` | Config file path |
| `--verbose` | — | Print the call stack when a command throws |
| `-h, --help` | — | Help |
| `-v, --version` | — | Version |

When `--config-path` is not passed explicitly, the CLI probes `tealina.config.ts`, `tealina.config.js`, and `tealina.config.mjs` in order. An explicitly passed path is used as-is, even if the file does not exist — the failure message names the file you asked for.

## Configuration

```ts
import { defineConfig } from 'tealina'

export default defineConfig({
  apiDir: 'src/api',
  apiBaseURL: '/api/v1',
  typesDir: 'types',
})
```

```ts
interface TealinaConfig {
  apiDir: string
  apiBaseURL: string
  typesDir: string
  exclude?: string[]
  handlerImport?: string
  suffix?: string
  sourceExt?: string
  testDir?: string
  template?: TemplateConfig
  gtype?: GtypeConfig
  gdoc?: GdocConfig
}
```

| Option | Default | Purpose |
| --- | --- | --- |
| `apiDir` | Required | Every file is a route |
| `apiBaseURL` | Required | URL prefix the routes answer on |
| `typesDir` | Required | Directory containing `api.d.ts` |
| `exclude` | `[]` | POSIX globs relative to `apiDir`; matching files do not participate in routing |
| `handlerImport` | `./handler${suffix}` | Fallback module specifier from which `types/api.d.ts` imports handler types |
| `suffix` | `.js` | Extension used in generated `import` statements |
| `sourceExt` | `.ts` | Extension of the generated files themselves; set to `.js` for JavaScript projects |
| `testDir` | — | Where `--with-test` generates integration tests |
| `template` | — | Custom handler and test generators |
| `gtype` | — | Prisma type generation options |
| `gdoc` | — | Custom documentation outputs |

`apiDir` is the only input for route discovery; `apiBaseURL` is a deployment choice, and the CLI does not infer it from directory names. The public artifact names are fixed: `types/api.d.ts`, `docs/api.json`, and `exports["./api"]` in the package.

Every command's options come from the config file, so package scripts can stay argument-free:

```json
{
  "scripts": {
    "create": "tealina create",
    "align": "tealina align",
    "gdoc": "tealina gdoc"
  }
}
```

## `create`

```bash
tealina create post/user      # src/api/post/user.ts
tealina create user/login     # defaults to post when no method is given
tealina create post/user/:id  # parameter segments are written as [id]
tealina create -m -i ./prisma/schema.prisma -t c
```

| Option | Description |
| --- | --- |
| `-m, --model` | Create one endpoint for each model in the Prisma schema |
| `-i, --input <path>` | Prisma schema path (default `./prisma/schema.prisma`) |
| `-t, --template-alias <alias>` | Select a handler template by alias |
| `--with-test` | Also generate an integration test file |
| `--tp, --tsconfig-path <path>` | tsconfig used to resolve handler types (default `./tsconfig.json`) |

Batch mode (`--model`) requires both `-i` and `-t`. Without `-t`, the fallback template with alias `*` is used.

A route segment can be written as `:id` or `[id]`; on disk it is always normalized to `[id].ts`.

## `delete`

```bash
tealina delete post/user/login
tealina delete post/user/login --with-test
```

Deletes the handler and rewrites the barrel files. `--with-test` also deletes the generated test file; `--tp / --tsconfig-path` is supported here as well.

## `align`

Rebuilds every `index.*` and the fallback `types/api.d.ts` from the files that actually exist on disk. Run it after adding, deleting, or modifying files by hand.

```bash
tealina align
tealina align --check
tealina align --check --json
```

| Option | Description |
| --- | --- |
| `--check` | Compare only, do not write; exit code 1 when files are stale |
| `--json` | Write an `{ ok, changed }` object to stdout |

`--check` uses the same generation logic as a normal run and stops before writing.

An `exclude` example:

```ts
export default defineConfig({
  apiDir: 'src/api',
  apiBaseURL: '/api/v1',
  typesDir: 'types',
  exclude: ['_shared/**', '**/*.test.ts'],
})
```

`align` always skips `index` files and dotfiles.

## `gdoc`

Reads `types/api.d.ts`, follows the handler imports, and writes `docs/api.json`. The **first exported type** in the file is read, so `ApiTypesForDoc` must stay first and `ApiTypesForClient` second.

```bash
tealina gdoc
tealina gdoc -o docs
tealina gdoc --check --json
```

| Option | Description |
| --- | --- |
| `-o, --output <string>` | Output directory (default `docs`) |
| `--check` | Compare only, do not write; exit code 1 means stale |
| `--json` | Write an `{ ok, changed }` object to stdout |
| `--tp, --tsconfig-path <path>` | tsconfig used to resolve types |

Custom outputs receive the full `ApiDoc` and `GdocContext`:

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

Setting `customOutputs` replaces the default `docs/api.json`; add `keepOriginalOutput: true` to keep both. `GdocContext` contains `outputDir`, `apiDir`, and `baseURL`.

## `gtype`

Reads a Prisma schema and generates pure TypeScript types. Relation fields are omitted, and the output can be composed independently.

```bash
tealina gtype
tealina gtype -i ./prisma/schema.prisma -o types/pure.d.ts -n Pure
```

| Option | Default | Description |
| --- | --- | --- |
| `-i, --input <path>` | `./prisma/schema.prisma` | Schema path; when `prisma.config.ts` exists, read `schema` from it |
| `-n, --namespace <name>` | `Pure` | Namespace; an empty string means no namespace wrapper |
| `-o, --output <string>` | `types/pure.d.ts` | Output file |

`gtype.overwrite` can make selected Prisma mutation type properties optional, rewrite their types, or remove them:

```ts
export default defineConfig({
  // ...
  gtype: {
    output: 'types/pure.d.ts',
    namespace: 'Pure',
    overwrite: {
      isOptional: [
        {
          blockName: '*',
          keyword: '*',
          kind: 'UpdateInput',
          predicate: prop => prop.name === 'id',
        },
      ],
    },
  },
})
```

The callback types are exported as `Overwrite`, `MatchForOptionalCheck`, `MatchForTypeTransform`, and `MatchForExcludeProp`.

## Custom Templates

`template.handlers` replaces the built-in stubs. Each item has an alias, an optional template name (which is also the generated file name), and an optional method:

```ts
import { defineApiTemplates, defineConfig } from 'tealina'

const handlers = defineApiTemplates([
  {
    alias: 'c',
    name: 'create',
    method: 'post',
    generateFn: ctx => `// ${ctx.method} ${ctx.dir}/${ctx.filename}`,
  },
  { alias: '*', generateFn: () => 'export default () => {}' },
])

export default defineConfig({
  apiDir: 'src/api',
  apiBaseURL: '/api/v1',
  typesDir: 'types',
  template: { handlers },
})
```

`ctx.sourceExt` tells the generator whether the project writes `.ts` or `.js`; `ctx.fileDir` is the directory the file will land in. Alias `*` is the fallback when nothing else matches.

## Programming Interface

| Export | Purpose |
| --- | --- |
| `defineConfig` | Identity helper for config objects |
| `defineApiTemplates` | Identity helper for handler template lists |
| `makeTemplate` | Identity helper for a single handler generator |
| `makeTestSuiteTemplate` / `makeTestHelperTemplate` | Identity helpers for test generators |
| `convertToOpenApiJson` | Converts an `ApiDoc` to OpenAPI 3.1 |
| `tealina/utility-types` | Pure type re-exports of `@tealina/utility-types` |

`OpenAPIV3` and `OpenAPIV3_1` are re-exported as types from `openapi-types`.


Tealina is a code generation CLI tool that helps you:
- Generate routing mappings from your API directory structure
- Create TypeScript types from your Prisma schema
- Generate API documentation from your API type definitions

### Basic Setup

The CLI reads one config file. `apiDir` names the directory whose tree is the route
table, and `apiBaseURL` is the URL prefix those routes answer under:

```ts
// tealina.config.ts
import { defineConfig } from 'tealina'

export default defineConfig({
  apiDir: 'src/api',
  apiBaseURL: '/api/v1',
  typesDir: 'types',
})
```

Every command takes its options from this file, so a package's scripts stay
argument-less:

```json
// package.json
{
  "scripts": {
    "create": "tealina create",
    "align": "tealina align",
    "gdoc": "tealina gdoc"
  }
}
```

The generated artifacts have fixed names — `types/api.d.ts`, `docs/api.json` and the
package's `exports["./api"]` entry — so renaming `apiDir` does not change anything a
consumer imports.

### Generate Route Mapping (`create` / `align`)

The generation follows a specific file structure convention:

- **First layer under `apiDir`**: HTTP methods (e.g., `get`, `post`, `put`)
- **Deeper layers**: Endpoint handler files (e.g., `health.ts`, `user/login.ts`)

Each method directory contains an `index.ts` that exports its routes, and the API root has
an `index.ts` that aggregates all methods.

**Example structure:**
```
src/api/
  |- get/
  |   |- health.ts
  |   |- index.ts
  |- post/
  |   |- user/
  |   |   |- login.ts
  |   |- index.ts
  |- index.ts
```

**get/index.ts:**
```ts
export default {
  health: import('./health.ts'), // route : handler
}
```

**src/api/index.ts:**
```ts
export default {
  get: import('./get/index.ts'),
  post: import('./post/index.ts'),
}
```

Add a handler stub with `tealina create <method>/<path>`, then rebuild the barrels with
`tealina align`. The CLI maintains every `index.ts` file from your structure. Route
parameters are wrapped in brackets: `[id]`.

```bash
tealina create post/user
tealina align
```

`align` can be told to leave things out of the route tree. Patterns are relative to
`apiDir` and matched as posix paths:

```ts
export default defineConfig({
  apiDir: 'src/api',
  apiBaseURL: '/api/v1',
  typesDir: 'types',
  exclude: ['_shared/**', '**/*.test.ts'],
})
```

Both `align` and `gdoc` accept `--check` (compare with disk, write nothing, exit 1 on
drift) and `--json` (one machine-readable object on stdout).

### Generate Types (`gtype`)

Reads your `prisma/schema.prisma` file and generates TypeScript types for all models,
types, and enums. For better composability, relation fields are omitted—only pure types
are generated.

```bash
tealina gtype
```

### Generate API Documentation (`gdoc`)

Parses `types/api.d.ts` to generate the document. The contract type it reads follows this
structure:

```ts
export type ApiTypeRecord = {
  get: {
    health: {
      body?: unknown
      headers?: unknown
      params?: unknown
      query?: unknown
    }
  },
  post: {
    // ...
  }
}
```

```bash
tealina gdoc
```

The default output is `docs/api.json`. A custom output receives the configured
`apiBaseURL` through `GdocContext`:

```ts
gdoc: {
  customOutputs: [
    (apiDoc, { baseURL }) => ({
      content: JSON.stringify(convertToOpenApiJson(apiDoc, baseURL)),
      filePath: 'docs/openapi.json',
    }),
  ],
}
```

### Tips

- Use the scaffolding CLI `create-tealina` to start a new project from scratch
- For advanced configuration and detailed documentation, visit the official [Tealina documentation](https://www.tealina.dev)

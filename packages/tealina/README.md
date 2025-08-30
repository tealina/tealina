
Tealina is a code generation CLI tool that helps you:
- Generate routing mappings from your API directory structure
- Create TypeScript types from your Prisma schema  
- Generate API documentation from your API type definitions

### Basic Setup

Tealina requires a root API directory to generate route mappings. We recommend using API version aliases (e.g., `api/v1` → `v1`):

```json
// package.json
{
  "scripts": {
    "v1": "tealina src/api-v1"
  }
}
```

### Generate Route Mapping (`-a`)

The generation follows a specific file structure convention:

- **First layer**: API version or prefix (e.g., `api-v1`)
- **Second layer**: HTTP methods (e.g., `get`, `post`, `put`)  
- **Deeper layers**: Endpoint handler files (e.g., `health.ts`, `user/login.ts`)

Each method directory contains an `index.ts` that exports its routes, and the API root has an `index.ts` that aggregates all methods.

**Example structure:**
```
api-v1/
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
  '/health': import('./health.ts'), // route : handler
}
```

**api-v1/index.ts:**
```ts
export default {
  'get': import('./get/index.ts'),
  'post': import('./post/index.ts'),
}
```

Run with `-a` to generate/update route mappings. The CLI will automatically maintain all `index.ts` files according to your structure. Route parameters are wrapped in brackets: `[id]`.

```bash
pnpm v1 -a
```

### Generate Types (`gtype`)

Reads your `prisma/schema.prisma` file and generates TypeScript types for all models, types, and enums. For better composability, relation fields are omitted—only pure types are generated.

```bash
pnpm v1 gtype
```

### Generate API Documentation (`gdoc`)

Parses your exported API types (from `types/api-v1.ts`) to generate documentation. Your `ApiTypeRecord` should follow this structure:

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
pnpm v1 gdoc
```

### Tips

- Use the scaffolding CLI `create-tealina` to start a new project from scratch
- For advanced configuration and detailed documentation, visit the official [Tealina documentation](https://www.tealina.dev)

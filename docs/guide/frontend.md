# Frontend Client

By default the scaffold generates only the backend. `--web` additionally generates `packages/web`: a Vite project with no UI framework, used to demonstrate how a client derives paths, payloads and responses directly from the server handler types.

```bash
pnpm create tealina my-app --web
```

The frontend dev server is `http://localhost:5173`, and it proxies the API prefix to `http://localhost:8000`.

## The Two Generated Files

```text
packages/web/
  index.html
  vite.config.ts
  src/
    main.ts            page: calls GET /health and renders the result
    api/client.ts      req: types come from the api-v1 handlers
```

`src/api/client.ts` is the important one:

```ts
import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'api-v1/api'
import { API_BASE_URL } from 'api-v1/version'

export const base = API_BASE_URL

let token = ''
export const setToken = (next: string) => {
  token = next
}

const requester = async (url: string, config: RequestInit) => {
  const headers = new Headers(config.headers)
  headers.set('Content-Type', 'application/json')
  if (token !== '') headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${base}${url}`, { ...config, headers })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  return response.json()
}

export const req = createFetchClient<ApiTypesForClient, RequestInit>(requester)
```

- `ApiTypesForClient` reaches here through `api-v1`'s `exports["./api"]`; it is the client projection of the handler annotations.
- `API_BASE_URL` is the same value used by the backend mount and the documentation JSON file; to change the prefix, change only `version.js`.
- `import type` is required: `./api` publishes only the `types` condition and has no runtime module.

`src/main.ts` does one thing:

```ts
import { req } from './api/client'

const health = await req.get('health')
const isOk: boolean = health.isOk
```

The type of `isOk` comes from the response annotation of the `GET /health` handler. The frontend has no second copy of the API declaration; **if you change a field in the handler, this line fails to compile**, and that is exactly the point.

`main.ts` is a placeholder page; you can delete it and write your own app under `src/`.

## Calling Conventions

Endpoint keys are logical paths without a leading slash:

```ts
await req.get('health')
await req.get('user/:id', { params: { id: 'u1' } })
await req.post('article', { body: { title: 'Hello' } })
```

RPC style nests by path segment:

```ts
import { createFetchRPC } from '@tealina/client'

const rpc = createFetchRPC<ApiTypesForClient, RequestInit>(requester)

await rpc.get.health()
await rpc.get.user[':id']({ params: { id: 'u1' } })
```

For a full description of both styles, the fetch/axios adapters and raw responses, see [@tealina/client](/reference/client.md).

## Proxy and Same-Origin

`vite.config.ts` proxies `API_BASE_URL` to `http://localhost:8000`:

```ts
import { defineConfig } from 'vite-plus'
import { API_BASE_URL } from 'api-v1/version'

export default defineConfig({
  server: {
    proxy: { [API_BASE_URL]: 'http://localhost:8000' },
  },
})
```

The page and the API are therefore same-origin in development, and the backend template does not need to send CORS headers. If `PORT` is not 8000, change the proxy target here.

## Adding a Frontend Without `--web`

The frontend has no scaffold-specific machinery. Declare the dependency in `packages/web/package.json`:

```json
{
  "devDependencies": {
    "api-v1": "workspace:*"
  }
}
```

Run `pnpm install` at the repository root to create the link, then:

```ts
import type { ApiTypesForClient } from 'api-v1/api'
```

`import type` is required here as well.

## Two Caveats

- Resolving these types pulls in the handlers' **source** (`api.d.ts` → `api-v1/src/` → `core` → framework → `tealina/utility-types`). The backend `tealina` and framework type packages must stay installed; the frontend's `skipLibCheck` cannot mask errors here, because it resolves `.ts`, not `.d.ts`.
- `@tealina/client` supports ESM only. Axios is not a runtime dependency; the axios adapter only requires you to pass in your own request function.

# @tealina/client

Generate a type-safe API client from server handler types. There is only one description of the
API — the server's `ApiTypesForClient` — and paths, payloads and responses are all derived from it,
so changing a field makes the frontend fail to compile.

The package provides both `fetch` and Axios adapters, and each comes in two call styles:

| Style | `fetch` | Axios | Call shape |
| --- | --- | --- | --- |
| Traditional | `createFetchClient` | `createAxiosReq` | `req.get('user', payload?, config?)` |
| RPC | `createFetchRPC` | `createAxiosRPC` | `rpc.get.user()` |

A payload parameter only appears when the endpoint declares a payload; for response-only endpoints,
the second argument is directly the optional config.

```bash
npm install @tealina/client
```

## API Records

The client takes the record type as its first type parameter. Take it from the API package generated
by `tealina align`:

```ts
import type { ApiTypesForClient } from 'api-v1/api'
```

When writing by hand, the record is layered by HTTP method, with one entry per logical path:

```ts
type ApiTypesForClient = {
  get: {
    health: { response: { isOk: boolean } }
    'user/:id': {
      params: { id: string }
      response: { id: string; name: string }
    }
  }
  post: {
    article: {
      body: { title: string }
      response: { id: number }
    }
  }
}
```

Keys are **logical paths**, without a leading slash. `params`, `query` and `body` describe the
request payload; `response` describes the value the Promise resolves to. `headers` belongs to the
second argument (config), not to the payload.

## fetch

### Traditional Style

```ts
import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'api-v1/api'

const req = createFetchClient<ApiTypesForClient, RequestInit>(
  async (url, config) => {
    const response = await fetch(`/api/v1${url}`, config)
    return response.json()
  },
)

const health = await req.get('health') // { isOk: boolean }

const user = await req.get('user/:id', {
  params: { id: 'u1' },
})

const created = await req.post('article', {
  body: { title: 'Hello' },
})
```

### RPC Style

RPC calls nest by path segment, so `'user/:id/update'` is `rpc.post.user[':id'].update(...)`. Paths
without slashes stay flat.

```ts
import { createFetchRPC } from '@tealina/client'
import type { ApiTypesForClient } from 'api-v1/api'

const rpc = createFetchRPC<ApiTypesForClient, RequestInit>(
  async (url, config) => {
    const response = await fetch(`/api/v1${url}`, config)
    return response.json()
  },
)

const health = await rpc.get.health()
const user = await rpc.get.user[':id']({ params: { id: 'u1' } })
```

## Axios

Bring your own Axios instance. Axios is not a runtime dependency of this package.

### Traditional Style

```ts
import axios, { type AxiosRequestConfig } from 'axios'
import { createAxiosReq } from '@tealina/client'
import type { ApiTypesForClient } from 'api-v1/api'

const instance = axios.create({ baseURL: '/api/v1' })

export const req = createAxiosReq<ApiTypesForClient, AxiosRequestConfig>(config =>
  instance.request(config).then(response => response.data),
)

const user = await req.get('user/:id', { params: { id: 'u1' } })
```

### RPC Style

```ts
import { createAxiosRPC } from '@tealina/client'

const rpc = createAxiosRPC<ApiTypesForClient, AxiosRequestConfig>(config =>
  instance.request(config).then(response => response.data),
)

const user = await rpc.get.user[':id']({ params: { id: 'u1' } })
```

### Raw Axios Responses

`createAxiosReq` and `createAxiosRPC` unwrap `response.data`. When you need the full Axios response
(status, headers, `data`), use the raw versions from the `./axios` subpath. The return type is your
`AxiosResponse`, with `data` narrowed to that endpoint's response type:

```ts
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { createRawAxiosRPC } from '@tealina/client/axios'

const rpc = createRawAxiosRPC<ApiTypesForClient, AxiosRequestConfig, AxiosResponse>(
  config => axios.request(config),
)

const response = await rpc.get.health()
response.data.isOk // boolean
```

The Traditional style counterpart is `createRawAxiosReq`.

## How a Call Is Encoded

Both styles share the same context builder:

| Payload field | Effect |
| --- | --- |
| `params` | Replaces `:name` segments in the path; longer names win |
| `query` | Appended with `URLSearchParams` |
| `body` | JSON-serialized by the fetch adapter, sent as `data` by the Axios adapter |

However the record is written, the request function always receives an absolute URL starting with
`/`. The base URL is joined inside the request function, as in the examples above.

The fetch adapter does not set `Content-Type: application/json`; add it yourself in the request
function or in the config for that call. Headers declared by the endpoint make it into the type of
the config parameter:

```ts
type Api = {
  get: {
    me: { headers: { authorization: string }; response: { name: string } }
  }
}

req.get('me', { headers: { authorization: `Bearer ${token}` } })
```

## Response Projection

A plain `response` type is exactly the value the Promise resolves to. Wrapped with `WithStatusCode`
or `WithHeaders`, it projects to the response body; a non-2xx wrapper projects to `never`:

```ts
import type { WithStatusCode } from '@tealina/utility-types'

type Api = {
  post: {
    article: {
      body: { title: string }
      response: WithStatusCode<201, { id: number }>
    }
  }
}

const created = await req.post('article', { body: { title: 'Hello' } })
// { id: number }
```

## JavaScript Callers

Type parameters are the normal way to name the API record. JavaScript has no type parameters, and an
uninferred shape parameter degrades to its constraint, silently producing `unknown` responses and
phantom payload parameters. Pass a `ShapeWitness` instead — it is read only as a type and is
`undefined` at runtime:

```js
import { createFetchClient } from '@tealina/client'

export const req = createFetchClient(
  requester,
  /** @type {import('@tealina/client').ShapeWitness<import('api-v1/api').ApiTypesForClient>} */ (undefined),
)
```

Asserting the initializer expression is intentional. `const` narrows to the initial value, so
`/** @type {...} */ const shape = undefined` loses the annotation — assert the initial value.

## Subpaths

| Entry | Exports |
| --- | --- |
| `@tealina/client` | `createFetchClient`, `createFetchRPC`, `createAxiosReq`, `createAxiosRPC`, `ShapeWitness` |
| `@tealina/client/fetch` | `createFetchClient`, `createFetchRPC` |
| `@tealina/client/axios` | `createAxiosReq`, `createAxiosRPC`, `createRawAxiosReq`, `createRawAxiosRPC` |
| `@tealina/client/core` | `createReq`, `createRPC`, `makeContext`, `ToReq`, `ToRPC`, `ClientRequestContext` |

The factories in core accept a request function you write yourself, so you can plug in another HTTP
library or a test double. They receive the **projected call shape**, not the raw API record: `ToReq`
for Traditional style, `ToRPC` for RPC style. The fetch and Axios factories just apply the
projection for you.

```ts
import { createReq, type ToReq } from '@tealina/client/core'

type Config = { signal?: AbortSignal }

const req = createReq<ToReq<MyApi, Config>, Config>((context, config) => {
  // context: { method, url, body?, raw? }
  return myHttpClient(context, config)
})
```

## Requirements

The package is ESM and requires Node ≥ 22. `fetch` is global there; Axios is provided by the caller.

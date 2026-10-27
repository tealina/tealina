# @tealina/client

Type-safe API clients generated from the handler types of a tealina server. One
description of the API — the server's `ApiTypesForClient` — drives paths, payloads and
responses on the client, so a renamed field stops the frontend compiling.

It ships adapters for `fetch` and Axios, each in two styles:

| Style | `fetch` | Axios | Call shape |
| --- | --- | --- | --- |
| Traditional | `createFetchClient` | `createAxiosReq` | `req.get('user', payload?, config?)` |
| RPC | `createFetchRPC` | `createAxiosRPC` | `rpc.get.user()` |

A payload argument appears only when the endpoint declares one; an endpoint with just a
response is called with the optional config alone.

```bash
npm install @tealina/client
```

## The API record

The client takes the record type as its first type argument. Get it from the API package
that `tealina align` generated:

```ts
import type { ApiTypesForClient } from 'api-v1/api'
```

Written by hand, the record has one level per HTTP method and one entry per logical path:

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

Keys are **logical paths**: no leading slash. `params`, `query` and `body` describe the
request payload; `response` describes what the promise resolves to. `headers` belongs to
the second (`config`) argument rather than the payload.

## Fetch

### Traditional style

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

### RPC style

An RPC call nests one level per path segment, so `'user/:id/update'` is
`rpc.post.user[':id'].update(...)`. A path without a slash stays flat.

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

### Traditional style

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

### RPC style

```ts
import { createAxiosRPC } from '@tealina/client'

const rpc = createAxiosRPC<ApiTypesForClient, AxiosRequestConfig>(config =>
  instance.request(config).then(response => response.data),
)

const user = await rpc.get.user[':id']({ params: { id: 'u1' } })
```

### Raw Axios responses

`createAxiosReq` and `createAxiosRPC` unwrap `response.data`. When you need the full
Axios response — status, headers, `data` — use the raw variants from the `./axios`
subpath. Their result is typed as your `AxiosResponse` type with `data` narrowed to the
endpoint's response:

```ts
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { createRawAxiosRPC } from '@tealina/client/axios'

const rpc = createRawAxiosRPC<ApiTypesForClient, AxiosRequestConfig, AxiosResponse>(
  config => axios.request(config),
)

const response = await rpc.get.health()
response.data.isOk // boolean
```

`createRawAxiosReq` is the traditional-style counterpart.

## How a call is encoded

Both styles route through the same context builder:

| Payload field | Effect |
| --- | --- |
| `params` | Replaces `:name` segments in the path; longest names first |
| `query` | Appended with `URLSearchParams` |
| `body` | JSON-stringified by the fetch adapter, sent as `data` by the Axios adapter |

The requester always receives an absolute URL beginning with `/`, whatever the spelling
on the record. Compose the base URL inside the requester, as the examples do.

The fetch adapter does not set `Content-Type: application/json`; add it in the requester
or in the call's config. Headers declared on an endpoint join the config argument's type:

```ts
type Api = {
  get: {
    me: { headers: { authorization: string }; response: { name: string } }
  }
}

req.get('me', { headers: { authorization: `Bearer ${token}` } })
```

## Response projection

A plain `response` type is what the promise resolves to. A response wrapped with
`WithStatusCode` or `WithHeaders` projects to its body — and a non-2xx wrapper becomes
`never`:

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

## JavaScript callers

Type arguments are the normal way to name the API record. JavaScript has none, and an
uninferred shape parameter falls back to its constraint, silently producing `unknown`
responses and phantom payload arguments. Pass a `ShapeWitness` instead — it is read as a
type and is `undefined` at runtime:

```js
import { createFetchClient } from '@tealina/client'

export const req = createFetchClient(
  requester,
  /** @type {import('@tealina/client').ShapeWitness<import('api-v1/api').ApiTypesForClient>} */ (undefined),
)
```

The cast around the initializer is deliberate. A `const` is narrowed to its initializer,
so `/** @type {...} */ const shape = undefined` loses the annotation — assert the
initializer instead.

## Subpath imports

| Entry | Exports |
| --- | --- |
| `@tealina/client` | `createFetchClient`, `createFetchRPC`, `createAxiosReq`, `createAxiosRPC`, `ShapeWitness` |
| `@tealina/client/fetch` | `createFetchClient`, `createFetchRPC` |
| `@tealina/client/axios` | `createAxiosReq`, `createAxiosRPC`, `createRawAxiosReq`, `createRawAxiosRPC` |
| `@tealina/client/core` | `createReq`, `createRPC`, `makeContext`, `ToReq`, `ToRPC`, `ClientRequestContext` |

The core factories accept a requester you write yourself, which is how another HTTP
library — or a test double — is plugged in. They take the **projected** call shape, not
the raw API record: `ToReq` for the traditional style, `ToRPC` for the RPC style. The
fetch and Axios factories exist to apply that projection for you.

```ts
import { createReq, type ToReq } from '@tealina/client/core'

type Config = { signal?: AbortSignal }

const req = createReq<ToReq<MyApi, Config>, Config>((context, config) => {
  // context: { method, url, body?, raw? }
  return myHttpClient(context, config)
})
```

## Requirements

The package is ESM and requires Node ≥ 22. `fetch` is a runtime global there; Axios is
supplied by the caller.

# @tealina/doc-ui

A self-contained API documentation page: an endpoint browser, type tables, Markdown comments and an
interactive playground. It can render Tealina's `ApiDoc` (the output of `tealina gdoc`) or an OpenAPI
document, and show several API versions on one page.

- Ctrl/Cmd+K searches endpoints
- Forms generated from declared payload types
- Light and dark themes
- One source option per API version
- Optional password gate and custom request handlers

```bash
npm install @tealina/doc-ui
```

Requires Node ≥ 22. The package is ESM and resolves its bundled `static/` directory with `node:fs`
and `import.meta.url`, so it needs real filesystem paths.

## Server

The package exports two functions and the config types:

| Export | Purpose |
| --- | --- |
| `assembleHTML(config)` | Returns the page HTML with the config injected |
| `getAssetsPath()` | Absolute path of the bundled `static/` directory |
| `TealinaVdocWebConfig` | Config type |
| `TealinaVdocSource` | One item of `config.sources` |
| `CommonFieldsType` | Type of `features.playground.commonFields` |

`assembleHTML` only produces a string; serving the HTML and the assets directory is still up to your
server.

### Express

```ts
import express, { Router } from 'express'
import { assembleHTML, getAssetsPath, type TealinaVdocSource } from '@tealina/doc-ui'

const VDOC_BASENAME = '/api-doc'

const sources: TealinaVdocSource[] = [
  { name: 'v1', baseURL: '/api/v1', jsonURL: '/api/v1/_doc/api.json' },
]

// Build once at startup: the source list only changes when the host mounts another version.
const html = await assembleHTML({ sources, errorMessageKey: 'message' })

const docRouter = Router()
  .get('/index.html', (_req, res) => res.type('html').send(html))
  .use(express.static(getAssetsPath()))

app.use(VDOC_BASENAME, docRouter)
```

### Fastify

```ts
import plugin4static from '@fastify/static'
import { assembleHTML, getAssetsPath } from '@tealina/doc-ui'

const html = await assembleHTML({ sources })

fastify.get('/api-doc/index.html', (_req, reply) =>
  reply.type('text/html').send(html),
)
await fastify.register(plugin4static, {
  root: getAssetsPath(),
  prefix: '/api-doc/',
  decorateReply: false,
})
```

### Koa

```ts
import Router from '@koa/router'
import mount from 'koa-mount'
import serve from 'koa-static'
import { assembleHTML, getAssetsPath } from '@tealina/doc-ui'

const html = await assembleHTML({ sources })
const router = new Router()
router.get('/api-doc/index.html', ctx => {
  ctx.type = 'text/html'
  ctx.body = html
})

app.use(router.routes())
app.use(mount('/api-doc', serve(getAssetsPath())))
```

Open `http://localhost:8000/api-doc/index.html`.

## Sources

`sources` is required. Each item names one mounted API version:

```ts
interface TealinaVdocSource {
  /** Prefix used by the playground when it sends requests. */
  baseURL: string
  /** Label in the version selector; defaults to `jsonURL`. */
  name?: string
  /** URL of the ApiDoc or OpenAPI JSON file. */
  jsonURL: string
  /** Optional text or Markdown shown at the top of the menu. */
  introduceURL?: string
}
```

The page fetches a source's `jsonURL` only when that source is selected. A document with an `openapi`
key is converted as OpenAPI 3.x; otherwise it is read as `ApiDoc`. The selector appears when there is
more than one source, and two sources cannot share a name.

## Configuration

```ts
import type { CommonFieldsType } from '@tealina/doc-ui'

type RequestConfig = { method: string; url: string } &
  Partial<Record<'body' | 'headers' | 'query' | 'params', unknown>>

interface TealinaVdocWebConfig {
  sources: TealinaVdocSource[]
  title?: string
  errorMessageKey?: string
  customScripts?: string[]
  customRequests?: {
    match: (config: RequestConfig) => boolean
    handler: (config: RequestConfig) => Promise<VariousResponseType>
  }[]
  features?: {
    playground?: {
      commonFields?: CommonFieldsType
    }
  }
  security?: {
    loginURL: string
    authenticationWay: 'session' | 'headers'
    logoutURL?: string
  }
}
```

`CommonFieldsType` maps each payload field to `'string'`, `'number'`, or an object with `type` and an
optional `default`.

| Option | Default | Purpose |
| --- | --- | --- |
| `title` | `"API Document"` | Browser title |
| `errorMessageKey` | — | Response field the playground reads as the error message |
| `customScripts` | `[]` | Script URLs injected before the config |
| `customRequests` | `[]` | Request handlers matched before the default fetch |
| `features.playground.commonFields` | — | Fields added to every playground form |

### Common Fields

Use `commonFields` when every request needs the same value (an authorization header, for example).
The playground creates a reusable form for them:

```ts
const html = await assembleHTML({
  sources,
  features: {
    playground: {
      commonFields: {
        headers: { Authorization: 'string' },
        query: { locale: { type: 'string', default: 'en' } },
      },
    },
  },
})
```

`'string'` and `'number'` are shorthands; the object form can add a default.

### Custom Requests

A handler can replace the default `fetch` for matching endpoints — for file uploads, streaming
responses, or APIs with special authentication. The handler receives the request config and returns
a tagged result:

```ts
type VariousResponseType =
  | { type: 'error'; status: number; result: string }
  | { type: 'binary'; status: number; result: { blob: Blob; filename: string } }
  | { type: 'stream' | 'json-stream'; status: number; result: AsyncGenerator<string> }
  | { type: 'text' | 'json'; status: number; result: string }
```

Handlers are functions and cannot be serialized into the injected config. Provide a script through
`customScripts` that assigns the handlers to the global the page reads:

```ts
const html = await assembleHTML({
  sources,
  customScripts: ['./custom-upload.js'],
})
```

```js
// custom-upload.js, served alongside the page
window.TEALINA_VDOC_CUSTOM_REQUESTS = [
  {
    match: config => config.url.includes('/upload'),
    async handler(config) {
      const body = await upload(config)
      return { type: 'json', status: 200, result: JSON.stringify(body) }
    },
  },
]
```

### Password Protection

`security` puts a password form in front of the page. The page POSTs `{ password }` to `loginURL`:

- `authenticationWay: 'session'` — the endpoint returns `200` and the browser keeps the session
  cookie. `logoutURL` is called when the user logs out.
- `authenticationWay: 'headers'` — the endpoint returns a JSON object containing the request headers
  the page attaches when fetching documentation JSON files.

```ts
const html = await assembleHTML({
  sources,
  security: {
    loginURL: '/api/doc-login',
    authenticationWay: 'session',
    logoutURL: '/api/doc-logout',
  },
})
```

## Notes

The page is a static asset. Build the HTML once at startup and send the same string for every
request — the config changes only when the host mounts another API version.

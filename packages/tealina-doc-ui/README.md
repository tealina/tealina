# @tealina/doc-ui

A self-contained documentation page for a tealina API: endpoint browser, type tables,
Markdown comments, and an interactive playground. It renders either a tealina `ApiDoc`
(what `tealina gdoc` writes) or an OpenAPI document, and can show several API versions
in one page.

- Ctrl/Cmd+K search over endpoints
- Forms generated from the declared payload types
- Light and dark themes
- One source selector per API version
- Optional password gate and custom request handlers

```bash
npm install @tealina/doc-ui
```

Requires Node ≥ 22. The package is ESM and resolves its bundled `static/` directory
with `node:fs` and `import.meta.url`, so it expects a real filesystem path.

## Server side

The package exports two functions and its config types:

| Export | Purpose |
| --- | --- |
| `assembleHTML(config)` | Returns the page HTML with the config injected |
| `getAssetsPath()` | Absolute path of the bundled `static/` directory |
| `TealinaVdocWebConfig` | Config type |
| `TealinaVdocSource` | One entry of `config.sources` |
| `CommonFieldsType` | Type of `features.playground.commonFields` |

`assembleHTML` only builds a string. Your server still has to serve that HTML and the
assets directory.

### Express

```ts
import express, { Router } from 'express'
import { assembleHTML, getAssetsPath, type TealinaVdocSource } from '@tealina/doc-ui'

const VDOC_BASENAME = '/api-doc'

const sources: TealinaVdocSource[] = [
  { name: 'v1', baseURL: '/api/v1', jsonURL: '/api/v1/_doc/api.json' },
]

// Build once: the source list only changes when the host mounts another version.
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

`sources` is required. Each entry names one mounted API version:

```ts
interface TealinaVdocSource {
  /** Prefix used by the playground when it sends a request. */
  baseURL: string
  /** Label in the version selector; defaults to `jsonURL`. */
  name?: string
  /** URL of the ApiDoc or OpenAPI json. */
  jsonURL: string
  /** Optional text or Markdown shown at the top of the menu. */
  introduceURL?: string
}
```

The page fetches each `jsonURL` when it is selected. A document with an `openapi` key is
converted from OpenAPI 3.x; otherwise it is read as an `ApiDoc`. The selector appears as
soon as there is more than one source, and two sources must not share a `name`.

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

`CommonFieldsType` maps each payload field to `'string'`, `'number'`, or an object with
a `type` and an optional `default`.

| Option | Default | Purpose |
| --- | --- | --- |
| `title` | `"API Document"` | Browser title |
| `errorMessageKey` | — | Response field the playground reads as an error message |
| `customScripts` | `[]` | Script URLs injected before the config |
| `customRequests` | `[]` | Request handlers matched before the default fetch |
| `features.playground.commonFields` | — | Fields added to every playground form |

### Common fields

Use `commonFields` for values every request needs, such as an authorization header. The
playground creates one reusable form for them:

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

`'string'` and `'number'` are shorthands; the object form adds a default value.

### Custom requests

A handler can replace the default `fetch` for matching endpoints — for a file upload, a
streaming response, or an API with unusual authentication. The handler receives the
request config and returns a tagged result:

```ts
type VariousResponseType =
  | { type: 'error'; status: number; result: string }
  | { type: 'binary'; status: number; result: { blob: Blob; filename: string } }
  | { type: 'stream' | 'json-stream'; status: number; result: AsyncGenerator<string> }
  | { type: 'text' | 'json'; status: number; result: string }
```

Handlers are functions, so they cannot be serialized into the injected config. Serve a
script through `customScripts` and assign them to the global the page reads:

```ts
const html = await assembleHTML({
  sources,
  customScripts: ['./custom-upload.js'],
})
```

```js
// custom-upload.js, served next to the page
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

### Password protection

`security` puts a password form in front of the page. The page POSTs
`{ password }` to `loginURL`:

- `authenticationWay: 'session'` — the endpoint answers `200` and the browser keeps the
  session cookie. `logoutURL` is called when the user logs out.
- `authenticationWay: 'headers'` — the endpoint answers with a JSON object of headers,
  which are attached when the page fetches the document json.

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

The page is a static asset. Build the HTML once at startup and serve the same string to
every request — the config only changes when the host mounts another API version.

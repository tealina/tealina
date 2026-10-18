import {
  assembleHTML,
  getAssetsPath,
  type TealinaVdocSource,
  type TealinaVdocWebConfig,
} from '@tealina/doc-ui'
import express, { type Express } from 'express'
import session from 'express-session'
import { fileURLToPath } from 'node:url'
import { DOC_PASSWORD, SESSION_SECRET } from './config/env.js'

/** Where the host serves the documentation page and its assets. */
export const VDOC_BASENAME = '/api-doc'

declare module 'express-session' {
  interface SessionData {
    isCanAccessApiDoc?: boolean
  }
}

/**
 * The page's login writes a signed cookie, so the request for an api version's json
 * carries the result. Mounted before any api package so every later route can read it.
 */
export const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 },
})

/**
 * The second source exists to exercise the page's OpenAPI importer: it is a static
 * spec, not a live api version, so no package mounts the routes it describes.
 */
const openApiSource: TealinaVdocSource = {
  name: 'v2 (OpenAPI)',
  baseURL: '/api/v2',
  jsonURL: `${VDOC_BASENAME}/openapi.json`,
}

const openApiFile = fileURLToPath(
  new URL('../docs/openapi.json', import.meta.url),
)

/**
 * The playground's custom request script. It shows that an endpoint can answer through
 * the page's own fetch logic instead of the generated request builder.
 */
const customRequestsScript = `
window.TEALINA_VDOC_CUSTOM_REQUESTS = [
  {
    match: config => config.url.includes('/health'),
    handler: async config => {
      const response = await fetch(config.url)
      return {
        type: 'text',
        status: response.status,
        contentType: response.headers.get('content-type') ?? 'text/plain',
        result: await response.text(),
      }
    },
  },
]
`

const buildConfig = (
  sources: TealinaVdocSource[],
  customScripts: string[],
): TealinaVdocWebConfig => ({
  sources: [...sources, openApiSource],
  title: 'Tealina Doc Factory',
  errorMessageKey: 'message',
  security: {
    authenticationWay: 'session',
    loginURL: `${VDOC_BASENAME}/validate`,
    logoutURL: `${VDOC_BASENAME}/logout`,
  },
  customScripts,
  features: {
    playground: {
      commonFields: {
        headers: { Authorization: 'string' },
        body: {
          skip: { type: 'number', default: 0 },
          take: { type: 'number', default: 10 },
        },
      },
    },
  },
})

/**
 * Mount the documentation page for every api version the host runs.
 *
 * The page is built once at startup: its source list is fixed by the versions the host
 * mounts, so there is nothing to recompute per request. Two versions must not share a
 * name, or the selector in the page would show two entries that look the same.
 */
export const mountDocs = async (app: Express, sources: TealinaVdocSource[]) => {
  if (sources.length === 0) {
    throw new Error('mountDocs needs at least one api source')
  }
  const config = buildConfig(sources, [`${VDOC_BASENAME}/use-fetch.js`])
  // The UI's own dev server proxies `/api-doc`, fetches this json and builds the page
  // itself. It resolves `customScripts` against `/api-doc`, so the paths are relative
  // there; the assembled page above gets the absolute spelling.
  const devConfig = buildConfig(sources, ['./use-fetch.js'])
  const labels = new Set<string>()
  for (const source of config.sources) {
    const label = source.name ?? source.jsonURL
    if (labels.has(label)) {
      throw new Error(
        `Duplicate api source "${label}" in the documentation page`,
      )
    }
    labels.add(label)
  }

  const html = await assembleHTML(config)
  const sendPage = (_req: express.Request, res: express.Response) => {
    res.type('html').send(html)
  }
  app.get(`${VDOC_BASENAME}/index.html`, sendPage)
  app.get(VDOC_BASENAME, sendPage)
  app.get(`${VDOC_BASENAME}/`, sendPage)

  app.post(`${VDOC_BASENAME}/validate`, (req, res) => {
    const { password } = req.body ?? {}
    if (password === DOC_PASSWORD) {
      req.session.isCanAccessApiDoc = true
      res.sendStatus(200)
      return
    }
    if (password === 'headers') {
      res.json({ auth: 'xxxx' })
      return
    }
    res.sendStatus(401)
  })

  app.post(`${VDOC_BASENAME}/logout`, (req, res) => {
    delete req.session.isCanAccessApiDoc
    res.sendStatus(200)
  })

  app.get(`${VDOC_BASENAME}/use-fetch.js`, (_req, res) => {
    res.type('application/javascript').send(customRequestsScript)
  })

  app.get(`${VDOC_BASENAME}/config.json`, (_req, res) => {
    res.json(devConfig)
  })

  app.get(openApiSource.jsonURL, (_req, res) => {
    res.sendFile(openApiFile)
  })

  app.use(VDOC_BASENAME, express.static(getAssetsPath()))
}

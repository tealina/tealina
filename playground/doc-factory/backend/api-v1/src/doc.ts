import type { TealinaVdocSource } from '@tealina/doc-ui'
import type { Express, RequestHandler } from 'express'
import type {} from 'express-session'
import { fileURLToPath } from 'node:url'
import { API_BASE_URL, API_VERSION } from '../version.js'

declare module 'express-session' {
  interface SessionData {
    isCanAccessApiDoc?: boolean
  }
}

// Resolved from this module rather than from the working directory: the command that
// writes it runs in the package, but the server may be started from anywhere.
const jsonFile = fileURLToPath(new URL('../docs/api.json', import.meta.url))

/**
 * The document json is only for callers that passed the page's login, or that present
 * the playground's `auth` header. This mirrors the two ways the documentation page
 * itself lets a visitor in.
 */
const canReadDoc: RequestHandler = (req, res, next) => {
  if (req.session?.isCanAccessApiDoc || req.headers.auth === 'xxxx') {
    next()
    return
  }
  res.sendStatus(401)
}

/**
 * This version's entry in the documentation page's source list. The page belongs to the
 * host; this package publishes the json it reads.
 */
export const docSource: TealinaVdocSource = {
  name: API_VERSION,
  baseURL: API_BASE_URL,
  jsonURL: `${API_BASE_URL}/_doc/api.json`,
}

/** Serve this version's document json at `docSource.jsonURL`. */
export const serveDocJson = (app: Express) => {
  app.get(docSource.jsonURL, canReadDoc, (_req, res) => {
    res.sendFile(jsonFile)
  })
}

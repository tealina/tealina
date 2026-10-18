import type { TealinaVdocSource } from '@tealina/doc-ui'
import express, { Router, type RequestHandler } from 'express'
import apisV1 from './api/index.js'
import { docSource, serveDocJson } from './doc.js'
import { buildRouter } from './router.js'
import { API_BASE_URL } from '../version.js'

const setupApiHeaders: RequestHandler = (_req, res, next) => {
  // res.setHeader('Access-Control-Allow-Methods', 'POST,GET')
  res.setHeader('Content-Type', 'application/json;charset=utf-8')
  next()
}

/**
 * Mount this api version onto an express app: its body parsers, its routes under
 * `API_BASE_URL`, and its document json. The documentation page itself belongs to the
 * host, which collects one source from every mounted version.
 *
 * What the host adds on top — the documentation page and the static assets, for the
 * scaffold — is registered after this, so the api keeps the prefix it owns.
 */
export const mount = async (
  app: ReturnType<typeof express>,
): Promise<TealinaVdocSource> => {
  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())
  serveDocJson(app)
  const apiRoutes = await buildRouter(apisV1)
  const apiRouter = Router({ caseSensitive: true })
    .use(setupApiHeaders)
    .use(apiRoutes)
  app.use(API_BASE_URL, apiRouter)
  return docSource
}

export { API_BASE_URL }

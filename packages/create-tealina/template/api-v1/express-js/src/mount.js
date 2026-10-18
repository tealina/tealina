import express, { Router } from 'express'
import apisV1 from './api/index.js'
import { docSource, serveDocJson } from './doc.js'
import { buildRouter } from './router.js'
import { API_BASE_URL } from '../version.js'

/** @type {import('express').RequestHandler} */
const setupApiHeaders = (_req, res, next) => {
  // res.setHeader('Access-Control-Allow-Methods', 'POST,GET')
  res.setHeader('Content-Type', 'application/json;charset=utf-8')
  // `RequestHandler` declares `unknown` as its return type, and a checked `.js` arrow
  // with that declared type has to return something (TS2355). `next()` returns void.
  return next()
}

/**
 * Mount this api version onto an express app: its body parsers, its routes under
 * `API_BASE_URL`, and its document json. The documentation page itself belongs to the
 * host, which collects one source from every mounted version.
 *
 * What the host adds on top — the documentation page and the static assets, for the
 * scaffold — is registered after this, so the api keeps the prefix it owns.
 *
 * @param {import('express').Express} app
 * @returns {Promise<import('@tealina/doc-ui').TealinaVdocSource>}
 */
export const mount = async app => {
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

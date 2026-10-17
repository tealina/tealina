import express, { Router } from 'express'
import apisV1 from './api/index.js'
import { docRouter } from './doc.js'
import { buildRouter } from './router.js'
import { API_BASE_URL, VDOC_BASENAME } from '../version.js'

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
 * `API_BASE_URL`, and the documentation page under `VDOC_BASENAME`.
 *
 * What the host adds on top — static assets, for the scaffold — is registered after this,
 * so the api and the docs keep the prefixes they own.
 *
 * @param {import('express').Express} app
 */
export const mount = async app => {
  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())
  const apiRoutes = await buildRouter(apisV1)
  const apiRouter = Router({ caseSensitive: true })
    .use(setupApiHeaders)
    .use(apiRoutes)
  app.use(API_BASE_URL, apiRouter)
  app.use(VDOC_BASENAME, docRouter)
}

export { API_BASE_URL, VDOC_BASENAME }

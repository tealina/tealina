import { Router } from 'express'
import apisV1 from '../../api/v1/index.js'
import { buildRouter } from './router.js'

const setupApiHeaders = /** @type {import('express').RequestHandler} */ (
  (_req, res, next) => {
    // res.setHeader('Access-Control-Allow-Methods', 'POST,GET')
    res.setHeader('Content-Type', 'application/json;charset=utf-8')
    next()
  }
)

export const buildApiRouter = async () => {
  const v1ApiRouter = await buildRouter(apisV1)
  return Router({ caseSensitive: true })
    .use(setupApiHeaders)
    .use('/v1', v1ApiRouter)
  // .use('/v2', await buildRouter(apisV2))
}

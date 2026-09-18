import { type RequestHandler, Router } from 'express'
import { buildV1Router } from './v1.js'

const apiNotFoundHandler: RequestHandler = (req, res, next) => {
  res.status(404)
  next(new Error(`API not found: ${req.originalUrl}`))
}

const setupApiHeaders: RequestHandler = (_req, res, next) => {
  // res.setHeader('Access-Control-Allow-Methods', 'POST,GET')
  res.setHeader('Content-Type', 'application/json;charset=utf-8')
  next()
}

export const buildApiRouter = async () => {
  const v1ApiRouter = await buildV1Router()
  return (
    Router({ caseSensitive: true })
      .use(setupApiHeaders)
      .use('/v1', v1ApiRouter)
      // .use('/v2', v2ApiRouter)
      .use(apiNotFoundHandler)
  )
}

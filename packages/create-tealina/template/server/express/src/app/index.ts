import express, { type RequestHandler, Router } from 'express'
import { errorHandler } from './middlewares/errorHandler.js'
import { buildApiRouter } from './routes/api/index.js'
import { staticAssetsRouter } from './routes/static/assets.js'
import { VDOC_BASENAME, docRouter } from './routes/static/doc.js'

const notFoundHandler: RequestHandler = (req, res, next) => {
  res.status(404)
  next(new Error(`Not found: ${req.originalUrl}`))
}

/**
 * The order of route registration is important
 */
const buildAppRouter = (apiRouter: Router) =>
  Router()
    .use(express.urlencoded({ extended: true }))
    .use(express.json())
    .use('/api', apiRouter)
    .use(VDOC_BASENAME, docRouter)
    .use(staticAssetsRouter)

const createExpressApp = (appRouter: Router) =>
  express().use(appRouter).use(notFoundHandler).use(errorHandler)

const buildApp = async () => {
  const apiRouter = await buildApiRouter()
  const appRouter = buildAppRouter(apiRouter)
  return createExpressApp(appRouter)
}

export { buildApp }

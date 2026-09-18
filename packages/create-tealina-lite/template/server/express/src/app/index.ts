import express, { Router } from 'express'
import { buildApiRouter } from './routes/api/index.js'
import { staticAssetsRouter } from './routes/static/assets.js'
import { VDOC_BASENAME, docRouter } from './routes/static/doc.js'

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

const createExpressApp = (appRouter: Router) => express().use(appRouter)

const buildApp = async () => {
  const apiRouter = await buildApiRouter()
  const appRouter = buildAppRouter(apiRouter)
  return createExpressApp(appRouter)
}

export { buildApp }

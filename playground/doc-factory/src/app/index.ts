import express, { RequestHandler, Router } from 'express'
import { asyncFlow, omitFn, pickFn } from 'fp-lite'
import path from 'path'
import apisV1 from '../api-v1/index.js'
import { VDOC_BASENAME, docRouter } from './docRouter.js'
import { handleError } from './handleError.js'
import {
  handleApiNotFound,
  handleNotFound,
  handleStaticNotFound,
} from './handleNotFound.js'
import { registeApiRoutes } from './registeApiRoutes.js'
import { loadAPIs } from './resolveBatchExport.js'
import { setupApiHeaders } from './setupApiHeaders.js'
import { verifyToken } from './verifyToken.js'

const simpleLog: RequestHandler = (req, res, next) => {
  next()
  console.log('simple-log:', req.originalUrl)
}

const separateObject = <T, Keys extends ReadonlyArray<keyof T>>(
  x: T,
  ...keys: Keys
) => [pickFn(x, ...keys), omitFn(x, ...keys)] as const

const buildV1Router = async () => {
  const record = await loadAPIs(apisV1)
  const openRouter = Router()
  const authRouter = Router().use(verifyToken)
  const { get, ...rest } = record
  const [openGetApis, authGetApis] = separateObject(get, 'health')
  registeApiRoutes(openRouter, { get: openGetApis })
  registeApiRoutes(authRouter, { get: authGetApis, ...rest })
  const router = Router().use(openRouter).use(authRouter)
  return router
}

const buildApiRoute = async () => {
  const v1ApiRouter = await buildV1Router()
  return Router({ caseSensitive: true })
    .use('/api', setupApiHeaders)
    .use('/api/v1', v1ApiRouter)
}

const buildAppRouter = (apiRouter: Router) =>
  Router()
    .use(express.urlencoded({ extended: true }))
    .use(express.json())
    .use(apiRouter)
    .use(VDOC_BASENAME, docRouter)
    .use(express.static(path.resolve('public')))

const createExpressApp = (appRouter: Router) =>
  express()
    .use(simpleLog)
    .use(appRouter)
    .use('/api', handleApiNotFound) //The following is error handling
    .use(handleNotFound)
    .use(handleError)

const buildApp = asyncFlow(buildApiRoute, buildAppRouter, createExpressApp)

export { buildApp }

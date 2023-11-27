import express, { Router } from 'express'
import { asyncFlow } from 'fp-lite'
import path from 'node:path'
import { VDOC_BASENAME, docRouter } from './docRouter.js'
import { errorHandler } from '../middlewares/errorHandler.js'
import {
  notFoundHandler,
  staticNotFoundHandler,
} from '../middlewares/notFoundHandler.js'
import { buildApiRoute } from './buildApiRouter.js'

const staticResourceRouter = Router()
  .use(express.static(path.resolve('public')))
  .use(staticNotFoundHandler)

/**
 * The order of route registration is important
 */
const buildAppRouter = (apiRouter: Router) =>
  Router()
    .use(express.urlencoded({ extended: true }))
    .use(express.json())
    .use('/api', apiRouter)
    .use(VDOC_BASENAME, docRouter)
    .use(staticResourceRouter)

const createExpressApp = (appRouter: Router) =>
  express().use(appRouter).use(notFoundHandler).use(errorHandler)

const buildApp = asyncFlow(buildApiRoute, buildAppRouter, createExpressApp)

export { buildApp }

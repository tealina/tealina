import { Router } from 'express'
import { setupApiHeaders } from '../middlewares/setupApiHeaders.js'
import { buildV1Router } from './buildV1Router.js'
import { ApiNotFoundHandler } from '../middlewares/notFoundHandler.js'

export const buildApiRoute = async () => {
  const v1ApiRouter = await buildV1Router()
  return (
    Router({ caseSensitive: true })
      .use(setupApiHeaders)
      .use('/v1', v1ApiRouter)
      // .use('/v2', v2ApiRouter)
      .use(ApiNotFoundHandler)
  )
}

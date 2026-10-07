import Router from '@koa/router'
import { buildV1Router } from './v1.js'

export const buildApiRouter = async () => {
  const router = new Router({ prefix: '/api' })
  const v1ApiRouter = await buildV1Router()
  router.use(v1ApiRouter.routes())
  return router
}

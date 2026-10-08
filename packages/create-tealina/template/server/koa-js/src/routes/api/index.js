import Router from '@koa/router'
import apisV1 from '../../api/v1/index.js'
import { buildRouter } from './router.js'

export const buildApiRouter = async () => {
  const router = new Router({ prefix: '/api' })
  const v1ApiRouter = await buildRouter(apisV1, '/v1')
  router.use(v1ApiRouter.routes())
  // router.use((await buildRouter(apisV2, '/v2')).routes())
  return router
}

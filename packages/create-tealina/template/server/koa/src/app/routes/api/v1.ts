import Router from '@koa/router'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import type {
  CustomHandlerType,
  HTTPMethods,
  Simplify,
} from '../../../../types/handler.js'
import apisV1 from '../../../api-v1/index.js'
import { verifyToken } from '../../middlewares/verifyToken.js'

export type TakeMethodAndPathRecord<T extends Record<string, any>> = Simplify<{
  [K in keyof T]: { [N in keyof Awaited<T[K]>['default']]?: true }
}>

/**
 * APIs without the need to log in
 * Don't forget use OpenHandler to declare your handler type
 */
const OpenPathRecord: Partial<TakeMethodAndPathRecord<typeof apisV1>> = {
  get: { '/health': true },
  post: { '/login': true },
}

export const buildV1Router = async () => {
  const apiRecord = await loadAPIs(apisV1)
  const openRouter = new Router()
  const authRouter = new Router()
  authRouter.use(verifyToken)
  const routeOptions = transformToRouteOptions<CustomHandlerType[]>(apiRecord)
  const rawOpenApiRecord = OpenPathRecord as Partial<
    Record<string, Partial<Record<string, true>>>
  >
  for (const { url, method, handler } of routeOptions) {
    const router = rawOpenApiRecord[method]?.[url] ? openRouter : authRouter
    router[method as HTTPMethods](url, ...handler)
  }
  const v1ApiRouter = new Router({ prefix: '/v1' })
  v1ApiRouter.use(openRouter.routes())
  v1ApiRouter.use(authRouter.routes())
  return v1ApiRouter
}

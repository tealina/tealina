import Router from '@koa/router'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import type { CustomHandlerType, HTTPMethods } from '../../../types/handler.js'
import apisV1 from '../../api-v1/index.js'

/**
 * Nothing here decides who may call what: an endpoint settles that in its own file, and
 * both halves of the answer arrive in the chain. `authedApi(handler)` hands over
 * `[verifyToken, ...]` and `openApi(handler)` the handler alone, so every chain below is
 * registered exactly as written.
 */
export const buildV1Router = async () => {
  const apiRecord = await loadAPIs(apisV1)
  const routeOptions = transformToRouteOptions<CustomHandlerType[]>(apiRecord)
  const router = new Router({ prefix: '/v1' })
  for (const { url, method, handler } of routeOptions) {
    router[method as HTTPMethods](url, ...handler)
  }
  return router
}

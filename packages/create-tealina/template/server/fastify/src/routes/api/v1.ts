import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import type {
  FastifyPluginAsync,
  HTTPMethods,
  preHandlerAsyncHookHandler,
  preHandlerHookHandler,
} from 'fastify'
import type { CustomHandlerType } from '../../../types/handler.js'
import apisV1 from '../../api/v1/index.js'

/**
 * `transformToRouteOptions` reads a handler tuple back as a homogeneous array, so the
 * per-position types `openApi` / `authedApi` preserve are gone by the time we get here. The
 * `preHandler` slot legitimately holds hooks that are not `CustomHandlerType`: a
 * callback-style hook carries a third `done` parameter a route handler does not.
 */
type ChainElement =
  | preHandlerHookHandler
  | preHandlerAsyncHookHandler
  | CustomHandlerType

/**
 * Nothing here decides who may call what: `authedApi(handler)` hands over
 * `[verifyToken, ...]` and `openApi(handler)` the handler alone. The guard is therefore just
 * the first entry of `preHandler`, running after validation.
 */
export const buildV1Router: FastifyPluginAsync = async (fastify, _option) => {
  const apiRecord = await loadAPIs(apisV1)
  const routeOptions = transformToRouteOptions<ChainElement[]>(apiRecord)
  for (const { url, method, handler } of routeOptions) {
    fastify.route({
      url,
      method: method.toUpperCase() as HTTPMethods,
      preHandler: handler.slice(0, -1),
      // The chain's last element is always the route handler, but the widened array above
      // has lost that shape.
      handler: handler.at(-1) as CustomHandlerType,
    })
  }
}

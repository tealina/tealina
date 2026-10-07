import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import apisV1 from '../../api-v1/index.js'

/**
 * `transformToRouteOptions` reads a handler tuple back as a homogeneous array, so the
 * per-position types `openApi` / `authedApi` preserve are gone by the time we get here. The
 * `preHandler` slot legitimately holds hooks that are not `CustomHandlerType`: a
 * callback-style hook carries a third `done` parameter a route handler does not.
 *
 * Where the TypeScript tree writes `transformToRouteOptions<ChainElement[]>(...)`, this
 * annotates the argument instead. There is no JSDoc spelling for a call-site type argument,
 * and there does not need to be one: `T` is inferred from the argument, so typing the
 * argument pins it to the same thing.
 *
 * @typedef {import('fastify').preHandlerHookHandler | import('fastify').preHandlerAsyncHookHandler} PreHanlder
 * @typedef {import('fastify').HTTPMethods} HTTPMethods
 * @typedef {import('../../../types/handler.js').CustomHandlerType} CustomHandlerType
 * @typedef {PreHanlder | CustomHandlerType} ChainElement
 * @typedef {Record<string, Record<string, ChainElement[]>>} ApiRecord
 */

/**
 * Nothing here decides who may call what: `authedApi(handler)` hands over
 * `[verifyToken, ...]` and `openApi(handler)` the handler alone. The guard is therefore just
 * the first entry of `preHandler`, running after validation.
 *
 * @type {import('fastify').FastifyPluginAsync}
 */
export const buildV1Router = async (fastify, _option) => {
  /** @type {ApiRecord} */
  const apiRecord = await loadAPIs(apisV1)
  const routeOptions = transformToRouteOptions(apiRecord)
  for (const { url, method, handler } of routeOptions) {
    fastify.route({
      url,
      method: /** @type {HTTPMethods} */ (method.toUpperCase()),
      preHandler: handler.slice(0, -1),
      // The chain's last element is always the route handler, but the widened array above
      // has lost that shape.
      handler: /** @type {CustomHandlerType} */ (handler.at(-1)),
    })
  }
}

import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import type {
  FastifyPluginAsync,
  HTTPMethods,
  preHandlerAsyncHookHandler,
  preHandlerHookHandler,
} from 'fastify'
import type { CustomHandlerType } from '../../../types/handler.js'

/**
 * A version barrel as `align` writes it: one entry per method, each a lazy import of that
 * method's directory. `loadAPIs` takes exactly this, so its parameter is the shape worth
 * naming — `@tealina/server` does not export the type itself.
 */
type ApiBarrel = Parameters<typeof loadAPIs>[0]

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
 * Build the plugin that registers one version's routes; the prefix that version answers on
 * goes on the `register` call.
 *
 * Nothing here decides who may call what: `authedApi(handler)` hands over
 * `[verifyToken, ...]` and `openApi(handler)` the handler alone. The guard is therefore just
 * the first entry of `preHandler`, running after validation.
 */
export const buildRouter =
  (apis: ApiBarrel): FastifyPluginAsync =>
  async (fastify, _option) => {
    const apiRecord = await loadAPIs(apis)
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

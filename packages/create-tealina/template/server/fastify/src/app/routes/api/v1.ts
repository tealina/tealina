import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import type {
  FastifyPluginAsync,
  HTTPMethods,
  preHandlerAsyncHookHandler,
  preHandlerHookHandler,
} from 'fastify'
import type { CustomHandlerType } from '../../../../types/handler.js'
import apisV1 from '../../../api-v1/index.js'
import { openHandler } from '../../middlewares/auth/openHandler.js'
import { verifyToken } from '../../middlewares/auth/verifyToken.js'

/**
 * A chain element as this router sees it. `transformToRouteOptions` reads a handler tuple
 * back as a homogeneous array, so the per-position types `convention` preserves are gone by
 * the time we get here; the `preHandler` slot legitimately holds hooks that are not
 * `CustomHandlerType`, because a callback-style hook carries a third `done` parameter a
 * route handler does not. Widening the element type is what lets the `openHandler` marker,
 * and any real preHandler, ride in the chain.
 */
type ChainElement =
  | preHandlerHookHandler
  | preHandlerAsyncHookHandler
  | CustomHandlerType

/**
 * An endpoint decides this for itself. A handler chain carrying the `openHandler`
 * marker is registered without `verifyToken`; everything else is guarded, so an
 * endpoint that says nothing requires an Authorization header.
 *
 * The marker is how `convention(openHandler, handler)` announces a public route —
 * pair it with `OpenHandler` on the handler rather than `AuthedHandler`. Nothing
 * checks that the annotation and the marker agree, so make the two edits together.
 */
const kOpenHandlerName = openHandler.name

export const buildV1Router: FastifyPluginAsync = async (fastify, _option) => {
  const apiRecord = await loadAPIs(apisV1)
  fastify.register((restrictFastify, _opts, done) => {
    restrictFastify.addHook('preValidation', verifyToken)
    const routeOptions = transformToRouteOptions<ChainElement[]>(apiRecord)
    for (const { url, method, handler } of routeOptions) {
      // The marker stays in the chain, where it is just another preHandler: it is a
      // promise-style hook that resolves at once, so it costs one no-op call and the
      // split below is exactly the one the handler file wrote.
      const isOpen = handler.some(h => h.name === kOpenHandlerName)
      const instance = isOpen ? fastify : restrictFastify
      instance.route({
        url,
        method: method.toUpperCase() as HTTPMethods,
        preHandler: handler.slice(0, -1),
        // `convention` types its handler tuple as `[...PreHanlder[], CustomHandlerType]`,
        // so the last element is always a route handler; the widened array above has lost
        // that shape, hence the assertion.
        handler: handler.at(-1) as CustomHandlerType,
      })
    }
    done()
  })
}

import Router from '@koa/router'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import type {
  CustomHandlerType,
  HTTPMethods,
} from '../../../../types/handler.js'
import apisV1 from '../../../api-v1/index.js'
import { openHandler } from '../../middlewares/auth/openHandler.js'
import { verifyToken } from '../../middlewares/auth/verifyToken.js'

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

export const buildV1Router = async () => {
  const apiRecord = await loadAPIs(apisV1)
  const openRouter = new Router()
  const authRouter = new Router()
  authRouter.use(verifyToken)
  const routeOptions = transformToRouteOptions<CustomHandlerType[]>(apiRecord)
  for (const { url, method, handler } of routeOptions) {
    // The marker stays in the chain. It is a pass-through middleware, so it costs one
    // no-op call and the chain koa gets is exactly the one the handler file wrote.
    const isOpen = handler.some(h => h.name === kOpenHandlerName)
    const router = isOpen ? openRouter : authRouter
    router[method as HTTPMethods](url, ...handler)
  }
  const v1ApiRouter = new Router({ prefix: '/v1' })
  v1ApiRouter.use(openRouter.routes())
  v1ApiRouter.use(authRouter.routes())
  return v1ApiRouter
}

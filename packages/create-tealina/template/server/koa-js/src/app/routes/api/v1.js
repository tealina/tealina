import Router from '@koa/router'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import apisV1 from '../../../api-v1/index.js'
import { openHandler } from '../../middlewares/auth/openHandler.js'
import { verifyToken } from '../../middlewares/auth/verifyToken.js'

/**
 * An endpoint decides this for itself. A handler chain carrying the `openHandler`
 * marker is registered without `verifyToken`; everything else is guarded, so an
 * endpoint that says nothing requires an Authorization header.
 *
 * The marker is how `convention(openHandler, handler)` announces a public route —
 * pair it with `OpenAPI` on the handler rather than `AuthedAPI`. Nothing
 * checks that the annotation and the marker agree, so make the two edits together.
 */
const kOpenHandlerName = openHandler.name

/**
 * Where the TypeScript tree writes `transformToRouteOptions<CustomHandlerType[]>(...)`,
 * this annotates the argument instead. There is no JSDoc spelling for a call-site type
 * argument, and there does not need to be one: `T` is inferred from the argument, so
 * typing the argument pins it to the same thing.
 *
 * `ResolvedAPIs` is not re-exported by `@tealina/server`, hence the shape written out.
 *
 * @typedef {import('../../../../types/handler.js').CustomHandlerType} CustomHandlerType
 * @typedef {import('../../../../types/handler.js').HTTPMethods} HTTPMethods
 * @typedef {Record<string, Record<string, CustomHandlerType[]>>} ApiRecord
 */

export const buildV1Router = async () => {
  /** @type {ApiRecord} */
  const apiRecord = await loadAPIs(apisV1)
  const openRouter = new Router()
  const authRouter = new Router()
  authRouter.use(verifyToken)
  const routeOptions = transformToRouteOptions(apiRecord)
  for (const { url, method, handler } of routeOptions) {
    // The marker stays in the chain. It is a pass-through middleware, so it costs one
    // no-op call and the chain koa gets is exactly the one the handler file wrote.
    const isOpen = handler.some(h => h.name === kOpenHandlerName)
    const router = isOpen ? openRouter : authRouter
    // The cast is for the method lookup only: the route record carries a `string`, and
    // the router's overloads are keyed on the literal method names.
    router[/** @type {HTTPMethods} */ (method)](url, ...handler)
  }
  const v1ApiRouter = new Router({ prefix: '/v1' })
  v1ApiRouter.use(openRouter.routes())
  v1ApiRouter.use(authRouter.routes())
  return v1ApiRouter
}

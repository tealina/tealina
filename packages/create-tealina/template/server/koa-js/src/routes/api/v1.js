import Router from '@koa/router'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import apisV1 from '../../api/v1/index.js'

/**
 * Nothing here decides who may call what: an endpoint settles that in its own file, and
 * both halves of the answer arrive in the chain. `authedApi(handler)` hands over
 * `[verifyToken, ...]` and `openApi(handler)` the handler alone, so every chain below is
 * registered exactly as written — hence one router rather than a guarded and an unguarded
 * one.
 *
 * Where the TypeScript tree writes `transformToRouteOptions<CustomHandlerType[]>(...)`,
 * this annotates the argument instead. There is no JSDoc spelling for a call-site type
 * argument, and there does not need to be one: `T` is inferred from the argument, so
 * typing the argument pins it to the same thing.
 *
 * `ResolvedAPIs` is not re-exported by `@tealina/server`, hence the shape written out.
 *
 * @typedef {import('../../../types/handler.js').CustomHandlerType} CustomHandlerType
 * @typedef {import('../../../types/handler.js').HTTPMethods} HTTPMethods
 * @typedef {Record<string, Record<string, CustomHandlerType[]>>} ApiRecord
 */

export const buildV1Router = async () => {
  /** @type {ApiRecord} */
  const apiRecord = await loadAPIs(apisV1)
  const routeOptions = transformToRouteOptions(apiRecord)
  const router = new Router({ prefix: '/v1' })
  for (const { url, method, handler } of routeOptions) {
    // The cast is for the method lookup only: the route record carries a `string`, and
    // the router's overloads are keyed on the literal method names.
    router[/** @type {HTTPMethods} */ (method)](url, ...handler)
  }
  return router
}

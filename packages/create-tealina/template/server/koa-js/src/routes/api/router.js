import Router from '@koa/router'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'

/**
 * A version barrel as `align` writes it: one entry per method, each a lazy import of that
 * method's directory. Written out rather than derived from `loadAPIs`, because a JSDoc
 * `@typedef` has no way to spell the `Parameters<typeof loadAPIs>[0]` the TypeScript tree
 * names this with.
 *
 * @typedef {Record<string, Promise<{ default: any }>>} ApiBarrel
 * @typedef {import('../../../types/handler.js').CustomHandlerType} CustomHandlerType
 * @typedef {import('../../../types/handler.js').HTTPMethods} HTTPMethods
 */

/**
 * Register one version's routes on a router. `@koa/router` carries the prefix on the router
 * itself, so the caller passes the prefix it is building for.
 *
 * Nothing here decides who may call what: an endpoint settles that in its own file, and
 * both halves of the answer arrive in the chain. `authedApi(handler)` hands over
 * `[verifyToken, ...]` and `openApi(handler)` the handler alone, so every chain is
 * registered exactly as written.
 *
 * Where the TypeScript tree writes `transformToRouteOptions<CustomHandlerType[]>(...)`,
 * this annotates the argument instead. There is no JSDoc spelling for a call-site type
 * argument, and there does not need to be one: `T` is inferred from the argument, so
 * typing the argument pins it to the same thing.
 *
 * @param {ApiBarrel} apis
 * @param {string} prefix
 */
export const buildRouter = async (apis, prefix) => {
  /** @type {Record<string, Record<string, CustomHandlerType[]>>} */
  const apiRecord = await loadAPIs(apis)
  const routeOptions = transformToRouteOptions(apiRecord)
  const router = new Router({ prefix })
  for (const { url, method, handler } of routeOptions) {
    // The cast is for the method lookup only: the route record carries a `string`, and
    // the router's overloads are keyed on the literal method names.
    router[/** @type {HTTPMethods} */ (method)](url, ...handler)
  }
  return router
}

import Router from '@koa/router'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import type { CustomHandlerType, HTTPMethods } from 'core/handler'

/**
 * A version barrel as `align` writes it: one entry per method, each a lazy import of that
 * method's directory. `loadAPIs` takes exactly this, so its parameter is the shape worth
 * naming — `@tealina/server` does not export the type itself.
 */
type ApiBarrel = Parameters<typeof loadAPIs>[0]

/**
 * Register one version's routes on a router. `@koa/router` carries the prefix on the router
 * itself, so the caller passes the prefix it is building for.
 *
 * Nothing here decides who may call what: an endpoint settles that in its own file, and
 * both halves of the answer arrive in the chain. `authedApi(handler)` hands over
 * `[verifyToken, ...]` and `openApi(handler)` the handler alone, so every chain is
 * registered exactly as written.
 */
export const buildRouter = async (apis: ApiBarrel, prefix: string) => {
  const apiRecord = await loadAPIs(apis)
  const routeOptions = transformToRouteOptions<CustomHandlerType[]>(apiRecord)
  const router = new Router({ prefix })
  for (const { url, method, handler } of routeOptions) {
    router[method as HTTPMethods](url, ...handler)
  }
  return router
}

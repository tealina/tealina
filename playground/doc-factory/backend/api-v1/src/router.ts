import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import { Router } from 'express'
import type { CustomHandlerType } from 'core/handler'

type HttpMethod = keyof Pick<
  Router,
  | 'connect'
  | 'delete'
  | 'get'
  | 'head'
  | 'options'
  | 'patch'
  | 'post'
  | 'put'
  | 'trace'
>

/**
 * A version barrel as `align` writes it: one entry per method, each a lazy import of that
 * method's directory. `loadAPIs` takes exactly this, so its parameter is the shape worth
 * naming — `@tealina/server` does not export the type itself.
 */
type ApiBarrel = Parameters<typeof loadAPIs>[0]

/**
 * Register one version's routes on a router. The prefix that version answers on is the
 * caller's to choose: express strips a mounted prefix before the router sees the url.
 *
 * Nothing here decides who may call what: an endpoint settles that in its own file, and
 * both halves of the answer arrive in the chain. `authedApi(handler)` hands over
 * `[verifyToken, ...]` and `openApi(handler)` the handler alone, so every chain is
 * registered exactly as written.
 */
export const buildRouter = async (apis: ApiBarrel) => {
  const apiRecord = await loadAPIs(apis)
  const routeOptions = transformToRouteOptions<CustomHandlerType[]>(apiRecord)
  const router = Router()
  for (const { url, method, handler } of routeOptions) {
    router[method as HttpMethod](url, handler)
  }
  return router
}

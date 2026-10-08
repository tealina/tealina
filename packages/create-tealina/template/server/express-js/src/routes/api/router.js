import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import { Router } from 'express'

/**
 * A version barrel as `align` writes it: one entry per method, each a lazy import of that
 * method's directory. Written out rather than derived from `loadAPIs`, because a JSDoc
 * `@typedef` has no way to spell the `Parameters<typeof loadAPIs>[0]` the TypeScript tree
 * names this with.
 *
 * @typedef {Record<string, Promise<{ default: any }>>} ApiBarrel
 * @typedef {import('express').Router} ExpressRouter
 * @typedef {import('../../../types/handler.js').CustomHandlerType} CustomHandlerType
 * @typedef {keyof Pick<ExpressRouter, 'connect' | 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace'>} HttpMethod
 */

/**
 * Register one version's routes on a router. The prefix that version answers on is the
 * caller's to choose: express strips a mounted prefix before the router sees the url.
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
 */
export const buildRouter = async apis => {
  /** @type {Record<string, Record<string, CustomHandlerType[]>>} */
  const apiRecord = await loadAPIs(apis)
  const routeOptions = transformToRouteOptions(apiRecord)
  const router = Router()
  for (const { url, method, handler } of routeOptions) {
    // The cast is for `noImplicitAny` only — express's own overloads are keyed on the
    // literal method names, which a `string` from the route record is not.
    router[/** @type {HttpMethod} */ (method)](url, handler)
  }
  return router
}

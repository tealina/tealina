import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import { Router } from 'express'
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
 * @typedef {import('express').Router} ExpressRouter
 * @typedef {import('../../../../types/handler.js').CustomHandlerType} CustomHandlerType
 * @typedef {Record<string, Record<string, CustomHandlerType[]>>} ApiRecord
 * @typedef {keyof Pick<ExpressRouter, 'connect' | 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace'>} HttpMethod
 */

export const buildV1Router = async () => {
  /** @type {ApiRecord} */
  const apiRecord = await loadAPIs(apisV1)
  const openRouter = Router()
  const authRouter = Router().use(verifyToken)
  const routeOptions = transformToRouteOptions(apiRecord)
  for (const { url, method, handler } of routeOptions) {
    // The marker stays in the chain. It is a pass-through middleware, so it costs one
    // no-op call and the chain express gets is exactly the one the handler file wrote.
    const isOpen = handler.some(h => h.name === kOpenHandlerName)
    const instance = isOpen ? openRouter : authRouter
    // The cast is for `noImplicitAny` only — express's own overloads are keyed on the
    // literal method names, which a `string` from the route record is not.
    instance[/** @type {HttpMethod} */ (method)](url, handler)
  }
  const router = Router().use(openRouter).use(authRouter)
  return router
}

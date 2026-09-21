import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import { Router } from 'express'
import type { CustomHandlerType } from '../../../../types/handler.js'
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

export const buildV1Router = async () => {
  const apiRecord = await loadAPIs(apisV1)
  const openRouter = Router()
  const authRouter = Router().use(verifyToken)
  const routeOptions = transformToRouteOptions<CustomHandlerType[]>(apiRecord)
  for (const { url, method, handler } of routeOptions) {
    // The marker stays in the chain. It is a pass-through middleware, so it costs one
    // no-op call and the chain express gets is exactly the one the handler file wrote.
    const isOpen = handler.some(h => h.name === kOpenHandlerName)
    const instance = isOpen ? openRouter : authRouter
    instance[method as HttpMethod](url, handler)
  }
  const router = Router().use(openRouter).use(authRouter)
  return router
}

import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import { Router } from 'express'
import type { CustomHandlerType } from '../../../../types/handler.js'
import type { Simplify } from '../../../../types/handler.js'
import apisV1 from '../../../api-v1/index.js'
import { verifyToken } from '../../middlewares/verifyToken.js'

type TakeMethodAndPathRecord<T extends Record<string, any>> = Simplify<{
  [K in keyof T]: { [N in keyof Awaited<T[K]>['default']]?: true }
}>

/**
 * APIs without the need to log in
 * Don't forget use OpenHandler to declare your handler type
 */
const OpenPathRecord: Partial<TakeMethodAndPathRecord<typeof apisV1>> = {
  get: { '/health': true },
  post: {},
}

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
  const rawOpenPathRecord = OpenPathRecord as Partial<
    Record<string, Partial<Record<string, true>>>
  >
  for (const { url, method, handler } of routeOptions) {
    const instance = rawOpenPathRecord[method]?.[url] ? openRouter : authRouter
    instance[method as HttpMethod](url, handler)
  }
  const router = Router().use(openRouter).use(authRouter)
  return router
}

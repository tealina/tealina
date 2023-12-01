import { Router } from 'express'
import { map, pipe, omitFn } from 'fp-lite'
import { Simplify } from '../../types/utility.js'
import apisV1 from '../api-v1/index.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { registeApiRoutes, validateMethod } from '../utils/registeApiRoutes.js'
import { ResolvedAPIs, loadAPIs } from '../utils/resolveBatchExport.js'
import { separateObject, toKeyValues } from '../utils/separateObject.js'

type MethodEndpoint<T extends Record<string, any>> = Simplify<{
  [K in keyof T]: ReadonlyArray<keyof Awaited<T[K]>['default']>
}>

/**
 * APIs without the need to log in
 * Don't forget use OpenHandler to declare your handler type
 */
const OpenApis: Partial<MethodEndpoint<typeof apisV1>> = {
  get: ['status'],
  // post: ['user/login'],
}

const registeSeparetely = (record: ResolvedAPIs) => {
  const openRouter = Router()
  const authRouter = Router().use(verifyToken)
  const fullAuth = omitFn(record, ...Object.keys(OpenApis))
  pipe(
    toKeyValues(OpenApis),
    map(([method, urls]) => {
      const [authApis, openApis] = separateObject(
        record[method],
        ...(urls as any),
      )
      registeApiRoutes(openRouter, method, openApis)
      registeApiRoutes(authRouter, method, authApis)
    }),
  )
  pipe(
    toKeyValues(fullAuth),
    map(([method, authApis]) => {
      registeApiRoutes(authRouter, method, authApis)
    }),
  )
  return [openRouter, authRouter] as const
}

export const buildV1Router = async () => {
  const record = await loadAPIs(apisV1)
  validateMethod(record)
  const [openRouter, authRouter] = registeSeparetely(record)
  const router = Router().use(openRouter).use(authRouter)
  return router
}

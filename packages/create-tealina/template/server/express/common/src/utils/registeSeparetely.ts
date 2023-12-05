import { Router } from 'express'
import { map, omitFn, pipe } from 'fp-lite'
import { Simplify } from '../../types/utility.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { registeApiRoutes } from './registeApiRoutes.js'
import { ResolvedAPIs } from './resolveBatchExport.js'
import { separateObject, toKeyValues } from './separateObject.js'

export type TakeMethodAndPathRecord<T extends Record<string, any>> = Simplify<{
  [K in keyof T]: ReadonlyArray<keyof Awaited<T[K]>['default']>
}>

export const registeSeparetely = (
  record: ResolvedAPIs,
  openPathRecords: Record<string, readonly string[]>,
) => {
  const openRouter = Router()
  const authRouter = Router().use(verifyToken)
  const fullAuth = omitFn(record, ...Object.keys(openPathRecords))
  pipe(
    toKeyValues(openPathRecords),
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

import type { FastifyInstance } from 'fastify'
import { map, omitFn, pipe } from 'fp-lite'
import type { Simplify } from '../../types/utility.js'
import { registeApiRoutes } from './registeApiRoutes.js'
import type { ResolvedAPIs } from './resolveBatchExport.js'
import { separateObject, toKeyValues } from './separateObject.js'

export type TakeMethodAndPathRecord<T extends Record<string, any>> = Simplify<{
  [K in keyof T]: ReadonlyArray<keyof Awaited<T[K]>['default']>
}>
export const registeSeparetely = (
  record: ResolvedAPIs,
  openPathRecord: Record<string, readonly string[]>,
  openRouter: FastifyInstance,
  authRouter: FastifyInstance,
) => {
  const fullAuth = omitFn(record, ...Object.keys(openPathRecord))
  pipe(
    toKeyValues(openPathRecord),
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
}

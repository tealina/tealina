import type { FastifyInstance } from 'fastify'
import { map, omitFn, pipe } from 'fp-lite'
import { registeApiRoutes } from './registeApiRoutes.js'
import { ResolvedAPIs } from './resolveBatchExport.js'
import { separateObject, toKeyValues } from './separateObject.js'
import { OpenApis } from '../app/buildV1Router.js'

export const registeSeparetely = (
  record: ResolvedAPIs,
  openRouter: FastifyInstance,
  authRouter: FastifyInstance,
) => {
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
}

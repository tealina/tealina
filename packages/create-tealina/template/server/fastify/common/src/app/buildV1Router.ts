import type { FastifyPluginAsync } from 'fastify'
import { Simplify } from '../../types/utility.js'
import apisV1 from '../api-v1/index.js'
import { checkMethodType, loadAPIs } from '../utils/resolveBatchExport.js'
import { verifyToken } from './verifyToken.js'
import { registeSeparetely } from '../utils/registeSeparetely.js'

type MethodEndpoint<T extends Record<string, any>> = Simplify<{
  [K in keyof T]: ReadonlyArray<keyof Awaited<T[K]>['default']>
}>

/**
 * APIs without the need to log in
 * Don't forget use OpenHandler to declare your handler type
 */
export const OpenApis: Partial<MethodEndpoint<typeof apisV1>> = {
  get: ['status'],
  // post: ['user/login'],
}

export const buildV1Router: FastifyPluginAsync = async (fastify, _option) => {
  checkMethodType(apisV1)
  const apiRecord = await loadAPIs(apisV1)
  fastify.register(function (restrictFastify, _opts, done) {
    restrictFastify.addHook('preValidation', verifyToken)
    registeSeparetely(apiRecord, fastify, restrictFastify)
    done()
  })
}

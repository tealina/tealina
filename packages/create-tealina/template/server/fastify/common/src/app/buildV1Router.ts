import type { FastifyPluginAsync } from 'fastify'
import apisV1 from '../api-v1/index.js'
import {
  registeSeparetely,
  type TakeMethodAndPathRecord,
} from '../utils/registeSeparetely.js'
import { checkMethodType, loadAPIs } from '../utils/resolveBatchExport.js'
import { verifyToken } from './verifyToken.js'

/**
 * APIs without the need to log in
 * Don't forget use OpenHandler to declare your handler type
 */
const OpenPathRecord: Partial<TakeMethodAndPathRecord<typeof apisV1>> = {
  get: ['status'],
  // post: ['user/login'],
}

export const buildV1Router: FastifyPluginAsync = async (fastify, _option) => {
  checkMethodType(apisV1)
  const apiRecord = await loadAPIs(apisV1)
  fastify.register(function (restrictFastify, _opts, done) {
    restrictFastify.addHook('preValidation', verifyToken)
    registeSeparetely(apiRecord, OpenPathRecord, fastify, restrictFastify)
    done()
  })
}

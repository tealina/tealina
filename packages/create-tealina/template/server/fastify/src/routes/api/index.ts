import type { FastifyPluginAsync } from 'fastify'
import apisV1 from '../../api/v1/index.js'
import { buildRouter } from './router.js'

export const buildApiRouter: FastifyPluginAsync = async (fastify, _option) => {
  await fastify.register(buildRouter(apisV1), { prefix: '/v1' })
  // await fastify.register(buildRouter(apisV2), { prefix: '/v2' });
}

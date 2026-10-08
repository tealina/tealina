import apisV1 from '../../api/v1/index.js'
import { buildRouter } from './router.js'

/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export const buildApiRouter = async (fastify, _option) => {
  await fastify.register(buildRouter(apisV1), { prefix: '/v1' })
  // await fastify.register(buildRouter(apisV2), { prefix: '/v2' });
}

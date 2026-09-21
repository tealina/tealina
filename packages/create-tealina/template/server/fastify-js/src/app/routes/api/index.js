import { buildV1Router } from './v1.js'

/**
 * @type {import('fastify').FastifyPluginAsync}
 */
export const buildApiRouter = async (fastify, _option) => {
  await fastify.register(buildV1Router, { prefix: '/v1' })
  // await fastify.register(buildV2Router, { prefix: '/v2' });
}

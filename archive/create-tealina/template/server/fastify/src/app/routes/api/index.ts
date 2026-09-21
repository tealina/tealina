import type { FastifyPluginAsync } from 'fastify'
import { buildV1Router } from './v1.js'

export const buildApiRouter: FastifyPluginAsync = async (fastify, _option) => {
  await fastify.register(buildV1Router, { prefix: '/v1' })
  // await fastify.register(buildV2Router, { prefix: '/v2' });
}

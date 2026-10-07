import Fastify, { type FastifyPluginAsync } from 'fastify'
import { buildApiRouter } from './routes/api/index.js'
import { docRouter, VDOC_BASENAME } from './routes/static/docs.js'
import { buildAssetsRouter } from './routes/static/assets.js'

/**
 * The order of route registration is important
 */
const buildAppRouter: FastifyPluginAsync = async (fastify, _option) => {
  fastify.register(buildAssetsRouter)
  fastify.register(docRouter, { prefix: VDOC_BASENAME })
  await fastify.register(buildApiRouter, { prefix: '/api' })
}

const buildApp = async () => {
  const fastify = Fastify({ logger: true })
  await fastify.register(buildAppRouter)
  return fastify
}

export { buildApp }

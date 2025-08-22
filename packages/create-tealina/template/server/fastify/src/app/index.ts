import Fastify, { FastifyPluginAsync } from 'fastify'
import qs from 'qs'
import { buildApiRouter } from './routes/api/index.js'
import { docRouter, VDOC_BASENAME } from './routes/static/docs.js'
import { buildAssetsRouter } from './routes/static/assets.js'

const buildAppRouter: FastifyPluginAsync = async (fastify, _option) => {
  fastify.register(buildAssetsRouter)
  fastify.register(docRouter, { prefix: VDOC_BASENAME })
  await fastify.register(buildApiRouter, { prefix: '/api' })
  fastify.ready(() => {
    console.log(fastify.printRoutes())
  })
}

const buildApp = async () => {
  const fastify = Fastify({
    logger: true,
    querystringParser: str => qs.parse(str),
  })
  await fastify.register(buildAppRouter)
  return fastify
}

export { buildApp }

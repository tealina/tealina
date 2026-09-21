import Fastify from 'fastify'
import { buildApiRouter } from './routes/api/index.js'
import { docRouter, VDOC_BASENAME } from './routes/static/docs.js'
import { buildAssetsRouter } from './routes/static/assets.js'

/**
 * The order of route registration is important
 *
 * `FastifyPluginAsync` is a plain function type, so the annotation is the whole story: the
 * arrow below is checked against it like any other assignment. A handler alias is the one
 * type here that needs more than that — see `types/alias.d.ts` for the second call
 * signature, without which `@type` above an `async` handler is rejected (TS1065).
 *
 * @type {import('fastify').FastifyPluginAsync}
 */
const buildAppRouter = async (fastify, _option) => {
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

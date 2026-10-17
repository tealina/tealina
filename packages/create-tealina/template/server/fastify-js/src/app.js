import Fastify from 'fastify'
import { mount } from 'api-v1/mount'
import { buildAssetsRouter } from './routes/static/assets.js'

/**
 * The api version package installs the routes and the documentation page. This host adds
 * what is its own: the static assets.
 *
 * The order of route registration is important.
 */
const buildApp = async () => {
  const fastify = Fastify({ logger: true })
  await mount(fastify)
  await fastify.register(buildAssetsRouter)
  return fastify
}

export { buildApp }

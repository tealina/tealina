import Fastify from 'fastify'
import { mount } from 'api-v1/mount'
import { mountDocs } from './doc.js'
import { buildAssetsRouter } from './routes/static/assets.js'

/**
 * The api version packages install their own routes and document json. This host adds
 * what is its own: the documentation page and the static assets.
 *
 * The order of route registration is important: the documentation page owns
 * `VDOC_BASENAME`, and the static assets own the rest of the root.
 */
const buildApp = async () => {
  const fastify = Fastify({ logger: true })
  const v1 = await mount(fastify)
  await mountDocs(fastify, [v1])
  await fastify.register(buildAssetsRouter)
  return fastify
}

export { buildApp }

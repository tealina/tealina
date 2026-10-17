import apisV1 from './api/index.js'
import { docRouter } from './doc.js'
import { buildRouter } from './router.js'
import { API_BASE_URL, VDOC_BASENAME } from '../version.js'

/**
 * Mount this api version onto a fastify instance: its routes under `API_BASE_URL`, and
 * the documentation page under `VDOC_BASENAME`.
 *
 * What the host adds on top — static assets, for the scaffold — is registered after this,
 * so the api and the docs keep the prefixes they own.
 *
 * @param {import('fastify').FastifyInstance} fastify
 */
export const mount = async fastify => {
  await fastify.register(buildRouter(apisV1), { prefix: API_BASE_URL })
  await fastify.register(docRouter, { prefix: VDOC_BASENAME })
}

export { API_BASE_URL, VDOC_BASENAME }

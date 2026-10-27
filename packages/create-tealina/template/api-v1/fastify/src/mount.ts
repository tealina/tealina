import type { TealinaVdocSource } from '@tealina/doc-ui'
import type { FastifyInstance } from 'fastify'
import apisV1 from './api/index.js'
import { docSource, serveDocJson } from './doc.js'
import { buildRouter } from './router.js'
import { API_BASE_URL } from '../version.js'

/**
 * Mount this api version onto a fastify instance: its routes under `API_BASE_URL`, and
 * its document json. The documentation page itself belongs to the host, which collects
 * one source from every mounted version.
 *
 * What the host adds on top — the documentation page and the static assets, for the
 * scaffold — is registered after this, so the api keeps the prefix it owns.
 */
export const mount = async (
  fastify: FastifyInstance,
): Promise<TealinaVdocSource> => {
  await fastify.register(buildRouter(apisV1), { prefix: API_BASE_URL })
  await fastify.register(serveDocJson, { prefix: API_BASE_URL })
  return docSource
}

export { API_BASE_URL }

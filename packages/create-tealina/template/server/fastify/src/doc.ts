import plugin4static from '@fastify/static'
import {
  assembleHTML,
  getAssetsPath,
  type TealinaVdocSource,
} from '@tealina/doc-ui'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

/** Where the host serves the documentation page and its assets. */
export const VDOC_BASENAME = '/api-doc'

/**
 * Mount the documentation page for every api version the host runs.
 *
 * The page is built once at startup: its source list is fixed by the versions the host
 * mounts, so there is nothing to recompute per request. Two versions must not share a
 * name, or the selector in the page would show two entries that look the same.
 */
export const mountDocs = async (
  fastify: FastifyInstance,
  sources: TealinaVdocSource[],
) => {
  if (sources.length === 0) {
    throw new Error('mountDocs needs at least one api source')
  }
  const labels = new Set<string>()
  for (const source of sources) {
    const label = source.name ?? source.jsonURL
    if (labels.has(label)) {
      throw new Error(
        `Duplicate api source "${label}" in the documentation page`,
      )
    }
    labels.add(label)
  }
  const html = await assembleHTML({
    sources,
    errorMessageKey: 'message',
    features: {
      playground: {
        commonFields: {
          headers: { Authorization: 'string' },
        },
      },
    },
  })
  const sendPage = (_req: FastifyRequest, res: FastifyReply) => {
    res.type('text/html').send(html)
  }
  const redirectToPage = (_req: FastifyRequest, res: FastifyReply) => {
    res.redirect(`${VDOC_BASENAME}/index.html`)
  }
  fastify.get(VDOC_BASENAME, redirectToPage)
  fastify.get(`${VDOC_BASENAME}/`, redirectToPage)
  fastify.get(`${VDOC_BASENAME}/index.html`, sendPage)
  await fastify.register(plugin4static, {
    root: getAssetsPath(),
    prefix: `${VDOC_BASENAME}/`,
    decorateReply: false,
    redirect: false,
  })
}

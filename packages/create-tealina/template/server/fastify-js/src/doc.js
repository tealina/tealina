import plugin4static from '@fastify/static'
import { assembleHTML, getAssetsPath } from '@tealina/doc-ui'

/** Where the host serves the documentation page and its assets. */
export const VDOC_BASENAME = '/api-doc'

/**
 * Mount the documentation page for every api version the host runs.
 *
 * The page is built once at startup: its source list is fixed by the versions the host
 * mounts, so there is nothing to recompute per request. Two versions must not share a
 * name, or the selector in the page would show two entries that look the same.
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {import('@tealina/doc-ui').TealinaVdocSource[]} sources
 */
export const mountDocs = async (fastify, sources) => {
  if (sources.length === 0) {
    throw new Error('mountDocs needs at least one api source')
  }
  const labels = new Set()
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
  /**
   * @param {import('fastify').FastifyRequest} _req
   * @param {import('fastify').FastifyReply} res
   */
  const sendPage = (_req, res) => {
    res.type('text/html').send(html)
  }
  /**
   * @param {import('fastify').FastifyRequest} _req
   * @param {import('fastify').FastifyReply} res
   */
  const redirectToPage = (_req, res) => {
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

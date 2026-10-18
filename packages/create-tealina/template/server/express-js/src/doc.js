import express from 'express'
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
 * @param {import('express').Express} app
 * @param {import('@tealina/doc-ui').TealinaVdocSource[]} sources
 */
export const mountDocs = async (app, sources) => {
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
   * @param {import('express').Request} _req
   * @param {import('express').Response} res
   */
  const redirectToPage = (_req, res) => {
    res.redirect(`${VDOC_BASENAME}/index.html`)
  }
  app.get(VDOC_BASENAME, redirectToPage)
  app.get(`${VDOC_BASENAME}/`, redirectToPage)
  app.get(`${VDOC_BASENAME}/index.html`, (_req, res) => {
    res.type('html').send(html)
  })
  app.use(VDOC_BASENAME, express.static(getAssetsPath()))
}

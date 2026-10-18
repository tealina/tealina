import {
  assembleHTML,
  getAssetsPath,
  type TealinaVdocSource,
} from '@tealina/doc-ui'
import express, { type Express } from 'express'

/** Where the host serves the documentation page and its assets. */
export const VDOC_BASENAME = '/api-doc'

/**
 * Mount the documentation page for every api version the host runs.
 *
 * The page is built once at startup: its source list is fixed by the versions the host
 * mounts, so there is nothing to recompute per request. Two versions must not share a
 * name, or the selector in the page would show two entries that look the same.
 */
export const mountDocs = async (app: Express, sources: TealinaVdocSource[]) => {
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
  const sendPage = (_req: express.Request, res: express.Response) => {
    res.type('html').send(html)
  }
  app.get(`${VDOC_BASENAME}/index.html`, sendPage)
  app.get(VDOC_BASENAME, sendPage)
  app.get(`${VDOC_BASENAME}/`, sendPage)
  app.use(VDOC_BASENAME, express.static(getAssetsPath()))
}

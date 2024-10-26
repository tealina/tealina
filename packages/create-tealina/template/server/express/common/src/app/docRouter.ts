import express, { Router } from 'express'
import path from 'node:path'
import {
  type TealinaVdocWebConfig,
  getAssetsPath,
  assembleHTML,
  VDOC_BASENAME,
} from '@tealina/doc-ui'

const vDocCofig: TealinaVdocWebConfig = {
  sources: [
    {
      baseURL: '/api/v1',
      jsonURL: `${VDOC_BASENAME}/v1.json`,
      name: 'v1',
    },
  ],
  errorMessageKey: 'message',
  features: {
    playground: {
      commonFields: {
        headers: {
          Authorization: 'string',
        },
        body: {
          skip: { type: 'number', default: 0 },
          take: { type: 'number', default: 10 },
        },
      },
    },
  },
}

const docRouter = Router({ caseSensitive: true })
  .get('/index.html', (_req, res, _next) => {
    assembleHTML(vDocCofig).then(html => res.send(html))
  })
  .get('/v1.json', (_req, res, _next) => {
    res.sendFile(path.resolve('docs/api-v1.json'))
  })
  .use(express.static(getAssetsPath()))

export { docRouter, VDOC_BASENAME }

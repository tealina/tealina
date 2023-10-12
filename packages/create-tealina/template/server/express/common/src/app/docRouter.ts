import express, { Router } from 'express'
import path from 'path'
import {
  TealinaVdocWebConfig,
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
  .get('/index.html', (req, res, next) => {
    assembleHTML(vDocCofig).then(html => res.send(html))
  })
  .get('/v1.json', (req, res, next) => {
    res.sendFile(path.resolve('docs/api-v1.json'))
  })
  .use(express.static(getAssetsPath()))

export { docRouter, VDOC_BASENAME }

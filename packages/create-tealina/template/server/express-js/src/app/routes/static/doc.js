import express, { Router } from 'express'
import path from 'node:path'
import { getAssetsPath, assembleHTML } from '@tealina/doc-ui'

const VDOC_BASENAME = '/api-doc'

/** @type {import('@tealina/doc-ui').TealinaVdocWebConfig} */
const vDocCofig = {
  sources: [
    {
      baseURL: '/api/v1',
      jsonURL: './v1.json',
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

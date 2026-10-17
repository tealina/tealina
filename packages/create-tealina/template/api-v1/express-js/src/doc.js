import express, { Router } from 'express'
import { fileURLToPath } from 'node:url'
import { getAssetsPath, assembleHTML } from '@tealina/doc-ui'
import { API_BASE_URL } from '../version.js'

// Resolved from this module rather than from the working directory: the command that
// writes it runs in the package, but the server may be started from anywhere.
const jsonFile = fileURLToPath(new URL('../docs/api.json', import.meta.url))

/** @type {import('@tealina/doc-ui').TealinaVdocWebConfig} */
const vDocCofig = {
  sources: [
    {
      baseURL: API_BASE_URL,
      jsonURL: './api.json',
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
  .get('/api.json', (_req, res, _next) => {
    res.sendFile(jsonFile)
  })
  .use(express.static(getAssetsPath()))

export { docRouter }

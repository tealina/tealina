import plugin4static from '@fastify/static'
import type { FastifyPluginCallback } from 'fastify'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  type TealinaVdocWebConfig,
  getAssetsPath,
  assembleHTML,
} from '@tealina/doc-ui'
import { API_BASE_URL } from '../version.js'

// Resolved from this module rather than from the working directory: the command that
// writes it runs in the package, but the server may be started from anywhere.
const jsonFile = fileURLToPath(new URL('../docs/api.json', import.meta.url))

const vDocCofig: TealinaVdocWebConfig = {
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

const docRouter: FastifyPluginCallback = function (fastify, _opts, done) {
  fastify.get('/api.json', (_req, res) => {
    readFile(jsonFile).then(buffer => res.send(buffer))
  })
  fastify.get('/index.html', (_req, res) => {
    res.type('text/html')
    assembleHTML(vDocCofig).then(html => res.send(html))
  })
  fastify.register(plugin4static, { root: getAssetsPath() })
  done()
}

export { docRouter }

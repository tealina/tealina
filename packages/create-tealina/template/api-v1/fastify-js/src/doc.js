import plugin4static from '@fastify/static'
import { readFile } from 'node:fs/promises'
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

/** @type {import('fastify').FastifyPluginCallback} */
const docRouter = function (fastify, _opts, done) {
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

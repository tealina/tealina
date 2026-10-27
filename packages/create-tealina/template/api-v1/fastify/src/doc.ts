import type { TealinaVdocSource } from '@tealina/doc-ui'
import type { FastifyPluginCallback } from 'fastify'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { API_BASE_URL, API_VERSION } from '../version.js'

// Resolved from this module rather than from the working directory: the command that
// writes it runs in the package, but the server may be started from anywhere.
const jsonFile = fileURLToPath(new URL('../docs/api.json', import.meta.url))

/**
 * This version's entry in the documentation page's source list. The page belongs to the
 * host; this package publishes the json it reads.
 */
export const docSource: TealinaVdocSource = {
  name: API_VERSION,
  baseURL: API_BASE_URL,
  jsonURL: `${API_BASE_URL}/_doc/api.json`,
}

/** Serve this version's document json at `docSource.jsonURL`. */
const serveDocJson: FastifyPluginCallback = function (fastify, _opts, done) {
  fastify.get('/_doc/api.json', (_req, res) => {
    readFile(jsonFile).then(buffer => {
      res.type('application/json')
      res.send(buffer)
    })
  })
  done()
}

export { serveDocJson }

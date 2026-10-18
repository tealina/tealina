import type { TealinaVdocSource } from '@tealina/doc-ui'
import type { Express } from 'express'
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
export const serveDocJson = (app: Express) => {
  app.get(docSource.jsonURL, (_req, res) => {
    res.sendFile(jsonFile)
  })
}

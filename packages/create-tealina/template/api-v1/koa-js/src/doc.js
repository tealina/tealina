import Router from '@koa/router'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { API_BASE_URL, API_VERSION } from '../version.js'

// Resolved from this module rather than from the working directory: the command that
// writes it runs in the package, but the server may be started from anywhere.
const jsonFile = fileURLToPath(new URL('../docs/api.json', import.meta.url))

/**
 * This version's entry in the documentation page's source list. The page belongs to the
 * host; this package publishes the json it reads.
 *
 * @type {import('@tealina/doc-ui').TealinaVdocSource}
 */
export const docSource = {
  name: API_VERSION,
  baseURL: API_BASE_URL,
  jsonURL: `${API_BASE_URL}/_doc/api.json`,
}

/**
 * Serve this version's document json at `docSource.jsonURL`.
 *
 * @param {import('koa')} app
 */
export const serveDocJson = app => {
  const router = new Router({ prefix: API_BASE_URL })
  router.get('/_doc/api.json', async ctx => {
    const buffer = await readFile(jsonFile)
    ctx.type = 'application/json'
    ctx.body = buffer
  })
  app.use(router.routes())
}

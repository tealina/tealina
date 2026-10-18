import bodyParser from '@koa/bodyparser'
import apisV1 from './api/index.js'
import { docSource, serveDocJson } from './doc.js'
import { buildRouter } from './router.js'
import { API_BASE_URL } from '../version.js'

/**
 * Mount this api version onto a koa app: its body parser, its routes under
 * `API_BASE_URL`, and its document json. The documentation page itself belongs to the
 * host, which collects one source from every mounted version.
 *
 * What the host adds on top — the documentation page and the static assets, for the
 * scaffold — is registered after this, so the api keeps the prefix it owns.
 *
 * @param {import('koa')} app
 * @returns {Promise<import('@tealina/doc-ui').TealinaVdocSource>}
 */
export const mount = async app => {
  app.use(bodyParser())
  serveDocJson(app)
  app.use((await buildRouter(apisV1, API_BASE_URL)).routes())
  return docSource
}

export { API_BASE_URL }

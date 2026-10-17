import bodyParser from '@koa/bodyparser'
import type Koa from 'koa'
import apisV1 from './api/index.js'
import { docRouter } from './doc.js'
import { buildRouter } from './router.js'
import { API_BASE_URL, VDOC_BASENAME } from '../version.js'

/**
 * Mount this api version onto a koa app: its body parser, its routes under
 * `API_BASE_URL`, and the documentation page under `VDOC_BASENAME`.
 *
 * What the host adds on top — static assets, for the scaffold — is registered after this,
 * so the api and the docs keep the prefixes they own.
 */
export const mount = async (app: Koa) => {
  app.use(bodyParser())
  app.use((await buildRouter(apisV1, API_BASE_URL)).routes())
  docRouter(app)
}

export { API_BASE_URL, VDOC_BASENAME }

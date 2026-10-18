import Koa from 'koa'
import { mount } from 'api-v1/mount'
import { mountDocs } from './doc.js'
import { buildAssetsRouter } from './routes/static/assets.js'

/**
 * The api version packages install their own body parsers, routes and document json.
 * This host adds what is its own: the documentation page and the static assets.
 *
 * The order of route registration is important: the documentation page owns
 * `VDOC_BASENAME`, and the static assets own the rest of the root.
 */
const buildApp = async () => {
  const app = new Koa()
  const v1 = await mount(app)
  await mountDocs(app, [v1])
  buildAssetsRouter(app)
  return app
}

export { buildApp }

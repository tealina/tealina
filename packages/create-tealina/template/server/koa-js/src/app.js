import Koa from 'koa'
import { mount } from 'api-v1/mount'
import { buildAssetsRouter } from './routes/static/assets.js'

/**
 * The api version package installs the body parser, the routes and the documentation
 * page. This host adds what is its own: the static assets.
 *
 * The order of route registration is important.
 */
const buildApp = async () => {
  const app = new Koa()
  await mount(app)
  buildAssetsRouter(app)
  return app
}

export { buildApp }

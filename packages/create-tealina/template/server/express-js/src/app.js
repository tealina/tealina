import express from 'express'
import { mount } from 'api-v1/mount'
import { staticAssetsRouter } from './routes/static/assets.js'

/**
 * The api version package installs the body parsers, the routes and the documentation
 * page. This host adds what is its own: the static assets.
 *
 * The order of route registration is important.
 */
const buildApp = async () => {
  const app = express()
  await mount(app)
  app.use(staticAssetsRouter)
  return app
}

export { buildApp }

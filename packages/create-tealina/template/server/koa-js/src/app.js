import bodyParser from '@koa/bodyparser'
import Koa from 'koa'
import { buildApiRouter } from './routes/api/index.js'
import { buildAssetsRouter } from './routes/static/assets.js'
import { docRouter } from './routes/static/docs.js'

/**
 * The order of route registration is important
 *
 * `koa` is shipped with `export =`, so `import('koa')` here is the application instance
 * itself — the type the TypeScript tree spells `Koa` off its default import.
 *
 * @param {import('koa')} app
 */
const buildAppRouter = async app => {
  const apiRouter = await buildApiRouter()
  app.use(apiRouter.routes())
  docRouter(app)
  buildAssetsRouter(app)
}

const buildApp = async () => {
  const app = new Koa()
  app.use(bodyParser())
  await buildAppRouter(app)
  return app
}

export { buildApp }

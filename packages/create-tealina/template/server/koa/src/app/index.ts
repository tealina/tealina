import bodyParser from '@koa/bodyparser'
import Koa from 'koa'
import { buildApiRouter } from './routes/api/index.js'
import { buildAssetsRouter } from './routes/static/assets.js'
import { docRouter } from './routes/static/docs.js'

/**
 * The order of route registration is important
 */
const buildAppRouter = async (app: Koa) => {
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

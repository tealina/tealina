import Koa from 'koa'
import { buildApiRouter } from './routes/api/index.js'
import { buildAssetsRouter } from './routes/static/assets.js'
import { docRouter } from './routes/static/docs.js'
import { errorHandler } from './middlewares/errorHandler.js'
import bodyParser from 'koa-bodyparser'

const buildAppRouter = async (app: Koa) => {
  const apiRouter = await buildApiRouter()
  app.use(apiRouter.routes())
  docRouter(app)
  buildAssetsRouter(app)
}

const buildApp = async () => {
  const app = new Koa()
  app.use(errorHandler)
  app.use(bodyParser())
  await buildAppRouter(app)
  return app
}

export { buildApp }

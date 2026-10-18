import express, { type RequestHandler } from 'express'
import { mount } from 'api-v1/mount'
import { mountDocs, sessionMiddleware } from './doc.js'
import { staticAssetsRouter } from './routes/static/assets.js'

const notFoundHandler: RequestHandler = (req, res, next) => {
  res.status(404)
  next(new Error(`Not found: ${req.originalUrl}`))
}

const errorHandler: express.ErrorRequestHandler = (err, _req, res, next) => {
  console.log('Catched', err)
  // A streaming handler may fail after the headers are already out; the only honest
  // response left is to close the connection.
  if (res.headersSent) {
    next(err)
    return
  }
  const code = res.statusCode - 200 < 100 ? 500 : res.statusCode
  res.status(code).json({ message: String(err), statusCode: code })
}

/**
 * The api version packages install their own body parsers, routes and document json.
 * This host adds what is its own: the session the documentation login writes, the page
 * itself, and the static assets.
 *
 * The order of route registration is important: the session comes first so an api
 * package's json route can read it, the documentation page owns `VDOC_BASENAME`, and
 * the static assets own the rest of the root.
 */
const buildApp = async () => {
  const app = express()
  app.use(sessionMiddleware)
  const v1 = await mount(app)
  await mountDocs(app, [v1])
  app.use(staticAssetsRouter)
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}

export { buildApp }

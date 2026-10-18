import express, { type RequestHandler } from 'express'
import { mount } from 'api-v1/mount'
import { mountDocs } from './doc.js'
import { staticAssetsRouter } from './routes/static/assets.js'

const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `No route answers ${req.method} ${req.originalUrl}`,
  })
}

const errorHandler: express.ErrorRequestHandler = (err, _req, res, next) => {
  // A stream may fail after the headers are out; the only honest response left is to
  // close the connection.
  if (res.headersSent) {
    next(err)
    return
  }
  const status =
    typeof err?.status === 'number' && err.status >= 400 && err.status < 600
      ? err.status
      : 500
  const code = typeof err?.code === 'string' ? err.code : 'INTERNAL_ERROR'
  const message =
    status === 500 ? 'Something went wrong on the server.' : String(err.message)
  if (status === 500) console.error(err)
  res.status(status).json({ code, message })
}

/**
 * The api version packages install their own body parsers, routes and document json.
 * This host adds what is its own: the documentation page and the static assets.
 *
 * The order of route registration is important: the documentation page owns
 * `VDOC_BASENAME`, and the static assets own the rest of the root. The json 404 and
 * error handlers come last so a handler's own `HttpError` keeps its status.
 */
const buildApp = async () => {
  const app = express()
  const v1 = await mount(app)
  await mountDocs(app, [v1])
  app.use(staticAssetsRouter)
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}

export { buildApp }

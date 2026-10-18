import express, { type RequestHandler, Router } from 'express'
import { fileURLToPath } from 'node:url'

const notFoundHandler: RequestHandler = (_req, res, _next) => {
  res.sendFile(
    fileURLToPath(new URL('../../../public/index.html', import.meta.url)),
  )
}

export const staticAssetsRouter = Router()
  .use(
    express.static(fileURLToPath(new URL('../../../public', import.meta.url))),
  )
  .use(notFoundHandler)

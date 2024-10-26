import type { RequestHandler } from 'express'
import path from 'node:path'

export const apiNotFoundHandler: RequestHandler = (req, res, next) => {
  res.status(404)
  next(new Error(`API not found: ${req.originalUrl}`))
}

export const staticNotFoundHandler: RequestHandler = (_req, res, _next) => {
  res.sendFile(path.resolve('public/index.html'))
}

export const notFoundHandler: RequestHandler = (req, res, next) => {
  res.status(404)
  next(new Error(`Not found: ${req.originalUrl}`))
}

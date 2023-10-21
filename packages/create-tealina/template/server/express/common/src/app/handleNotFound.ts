import { RequestHandler } from 'express'
import path from 'node:path'

export const handleApiNotFound: RequestHandler = (req, res, next) => {
  res.status(404)
  next(new Error(`API not found: ${req.originalUrl}`))
}

export const handleStaticNotFound: RequestHandler = (req, res, next) => {
  res.sendFile(path.resolve('public/index.html'))
}

export const handleNotFound: RequestHandler = (req, res, next) => {
  res.status(404)
  next(new Error(`Not found: ${req.originalUrl}`))
}

import type { RequestHandler } from 'express'

export const setupApiHeaders: RequestHandler = (_req, res, next) => {
  res.set('Access-Control-Allow-Methods', 'PUT,PATCH,POST,GET,DELETE,OPTIONS')
  res.setHeader('Content-Type', 'application/json;charset=utf-8')
  next()
}

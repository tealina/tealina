import type { RequestHandler } from 'express'

const setupApiHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET')
  res.setHeader('Content-Type', 'application/json;charset=utf-8')
  next()
}

export { setupApiHeaders }

import { RequestHandler } from 'express'

const setupApiHeaders: RequestHandler = (req, res, next) => {
  res.set('Access-Control-Allow-Methods', 'PUT,PATCH,POST,GET,DELETE,OPTIONS')
  res.setHeader('Content-Type', 'application/json;charset=utf-8')
  next()
}

export { setupApiHeaders }

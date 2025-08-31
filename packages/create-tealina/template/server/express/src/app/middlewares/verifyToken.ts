import type { RequestHandler } from 'express'
import { catchErrorWrapper } from './catchErrorWrapper.js'

const handler: RequestHandler = async (req, _res, next) => {
  //TODO: verify token
  console.log(req.url)
  //Assigns authorization context
  _res.locals.userId = 'xxx'
  next()
}

export const verifyToken = catchErrorWrapper(handler)

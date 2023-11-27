import { RequestHandler } from 'express'
import { catchErrorWrapper } from './catchErrorWrapper.js'

const handler: RequestHandler = async (req, _res, next) => {
  //TODO: verify token
  console.log(req.url)
  next()
}

export const verifyToken = catchErrorWrapper(handler)

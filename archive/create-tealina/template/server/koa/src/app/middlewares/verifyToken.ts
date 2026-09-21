import type { Middleware } from 'koa'
import { formatErrorResponse } from './errorHandler.js'

const verifyToken: Middleware = async (ctx, next) => {
  const { authorization } = ctx.headers
  if (authorization == null) {
    ctx.status = 401
    ctx.body = formatErrorResponse({
      code: 'Unauthorized',
      message: 'Authorization header is missing.',
    })
    return
  }
  //TODO: verify token
  //Assigns authorization context to request state
  ctx.state = { userId: 'xxx' }
  await next()
}

export { verifyToken }

import type { Middleware } from '@koa/router'
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
  await next()
}

export { verifyToken }

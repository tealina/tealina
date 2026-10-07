import type { Middleware } from 'koa'

/**
 * The guard every `authedApi(handler)` chain carries as its first element, ahead of the
 * endpoint's own middlewares.
 */
export const verifyToken: Middleware = async (ctx, next) => {
  const { authorization } = ctx.headers
  if (authorization == null) {
    ctx.status = 401
    ctx.body = {
      code: 'Unauthorized',
      message: 'Authorization header is missing.',
    }
    return
  }
  //TODO: verify token

  //Assigns authorization context, readable as `ctx.state.userId` in handlers
  ctx.state = { userId: 'xxx' }
  await next()
}

import type { Middleware } from 'koa'

/**
 * Guards every endpoint whose handler chain carries no `openHandler` marker
 * (see `src/app/routes/api/v1.ts`).
 */
const verifyToken: Middleware = async (ctx, next) => {
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

export { verifyToken }

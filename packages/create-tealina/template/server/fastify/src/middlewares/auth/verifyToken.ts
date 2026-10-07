import type { preHandlerAsyncHookHandler } from 'fastify'

/**
 * The guard every `authedApi(handler)` chain carries as its first element, ahead of the
 * endpoint's own middlewares. It runs after validation, as a `preHandler`.
 */
export const verifyToken: preHandlerAsyncHookHandler = async function (
  request,
  reply,
) {
  const { authorization } = request.headers
  if (authorization == null) {
    reply.code(401).send({
      code: 'Unauthorized',
      message: 'Authorization header is missing.',
    })
    return reply
  }
  //TODO: verify token

  //Assigns authorization context, readable as `request.locals.userId` in handlers
  request.locals = { userId: 'xxx' }
}

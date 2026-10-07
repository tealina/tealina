/**
 * The guard every `authedApi(handler)` chain carries as its first element, ahead of the
 * endpoint's own middlewares.
 *
 * It is a `preHandler` rather than a `preValidation` hook, because that is the slot a
 * chain's leading elements are registered into: it runs after validation, alongside
 * anything else the handler file put in front of the route handler.
 *
 * @type {import('fastify').preHandlerAsyncHookHandler}
 */
export const verifyToken = async function (request, reply) {
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

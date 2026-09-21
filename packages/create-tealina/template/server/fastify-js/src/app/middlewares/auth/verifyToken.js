/**
 * Guards every endpoint whose handler chain carries no `openHandler` marker
 * (see `src/app/routes/api/v1.js`).
 *
 * @type {import('fastify').preValidationAsyncHookHandler}
 */
const verifyToken = async function (request, reply) {
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

export { verifyToken }

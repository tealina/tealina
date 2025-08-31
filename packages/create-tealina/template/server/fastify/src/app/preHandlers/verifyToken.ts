import { preValidationAsyncHookHandler } from 'fastify'

const verifyToken: preValidationAsyncHookHandler = async function (
  request,
  reply,
) {
  const { authorization } = request.headers
  if (authorization == null) {
    reply.code(401).send({ error_reason: 'Authorization Failed' })
    return reply
  }
  //TODO: verify token

  //Assigns authorization context to request locals
  request.locals = { userId: 'xxx' }
}

export { verifyToken }

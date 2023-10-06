import { preValidationAsyncHookHandler } from 'fastify'

const verifyToken: preValidationAsyncHookHandler = async function (
  request,
  reply,
) {
  const { authorization } = request.headers
  if (authorization == null) {
    reply.code(402).send({ error_reason: 'Authorization Failed' })
    return reply
  }
}

export { verifyToken }

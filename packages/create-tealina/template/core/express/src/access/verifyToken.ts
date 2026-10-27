import type { RequestHandler } from 'express'

/**
 * The guard every `authedApi(handler)` chain carries as its first element, ahead of the
 * endpoint's own middlewares.
 */
export const verifyToken: RequestHandler = (req, res, next) => {
  const { authorization } = req.headers
  if (authorization == null) {
    res.status(401).json({
      code: 'Unauthorized',
      message: 'Authorization header is missing.',
    })
    return
  }
  //TODO: verify token

  //Assigns authorization context, readable as `res.locals.userId` in handlers
  res.locals.userId = 'xxx'
  next()
}

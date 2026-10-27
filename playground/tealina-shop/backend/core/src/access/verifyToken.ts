import type { RequestHandler } from 'express'
import { readToken } from '../auth/token.js'

/**
 * The guard every `authedApi(handler)` chain carries as its first element, ahead of the
 * endpoint's own middlewares.
 *
 * It accepts `Authorization: Bearer <token>` and the bare token, because the
 * documentation playground has a single text field and people paste either. A missing,
 * malformed or expired token is a 401 before the handler runs.
 */
export const verifyToken: RequestHandler = (req, res, next) => {
  const authorization = req.headers.authorization
  if (authorization == null) {
    res.status(401).json({
      code: 'Unauthorized',
      message: 'Authorization header is missing.',
    })
    return
  }
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : authorization

  const claims = readToken(token)
  if (claims == null) {
    res.status(401).json({
      code: 'Unauthorized',
      message: 'The token is invalid or has expired. Sign in again.',
    })
    return
  }

  // The authorization context, readable as `res.locals.userId` and `res.locals.role`
  // in handlers.
  res.locals.userId = claims.sub
  res.locals.role = claims.role
  next()
}

import type { RequestHandler } from 'express'
import { formatErrorResponse } from '../errorHandler.js'

/**
 * Guards every endpoint whose handler chain carries no `openHandler` marker
 * (see `src/app/routes/api/v1.ts`).
 */
const handler: RequestHandler = (req, res, next) => {
  const { authorization } = req.headers
  if (authorization == null) {
    res.status(401).json(
      formatErrorResponse({
        code: 'Unauthorized',
        message: 'Authorization header is missing.',
      }),
    )
    return
  }
  //TODO: verify token

  //Assigns authorization context, readable as `res.locals.userId` in handlers
  res.locals.userId = 'xxx'
  next()
}

export const verifyToken = handler

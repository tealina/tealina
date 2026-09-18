import type { ErrorRequestHandler } from 'express'

interface ErrorShape {
  code: string
  message: string
}

/**
 * The single place an error body is shaped, so a client never has to parse two
 * response shapes from the same server. `verifyToken` goes through this too.
 * Named to match the koa template, which has the same helper.
 */
export const formatErrorResponse = (data: ErrorShape) => data

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.log('Catched', err)
  const statusCode = res.statusCode - 200 < 100 ? 500 : res.statusCode
  res.status(statusCode).json(
    formatErrorResponse({
      code: statusCode.toString(),
      message: `${String(err)}`,
    }),
  )
}

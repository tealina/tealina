import type { Middleware } from 'koa'

interface KoaError extends Error {
  status?: number
}

interface ErrorShape {
  code: string
  message: string
}

/**
 * The single place an error body is shaped, so a client never has to parse two
 * response shapes from the same server. `verifyToken` goes through this too.
 * The express template has a helper with the same name.
 */
export const formatErrorResponse = (data: ErrorShape) => data

export const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    const koaError = err as KoaError
    ctx.status = koaError.status ?? 500
    ctx.body = formatErrorResponse({
      code: ctx.status.toString(),
      message: koaError.message ?? 'Internal Server Error',
    })
    // ctx.app.emit('error', err, ctx)
  }
}

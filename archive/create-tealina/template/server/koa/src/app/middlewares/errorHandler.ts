import type { Middleware } from 'koa'

interface KoaError extends Error {
  status?: number
}

interface ErrorShapre {
  code: string
  message: string
}

export const formatErrorResponse = (data: ErrorShapre) => data

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

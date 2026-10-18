import type { ApiErrorBody } from './model.js'

/**
 * A response the store and the handlers can throw. Express 5 forwards a rejected
 * promise to the error middleware, so a handler only has to raise it.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorBody['code'],
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const requireAdmin = (role: 'CUSTOMER' | 'ADMIN') => {
  if (role !== 'ADMIN') {
    throw new HttpError(403, 'FORBIDDEN', 'This endpoint is for admins only.')
  }
}

/** Path ids arrive as strings; the handlers declare them as numbers. */
export const parseId = (raw: string): number => {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, 'VALIDATION_ERROR', `"${raw}" is not a valid id.`)
  }
  return id
}

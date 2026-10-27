import type { ApiErrorBody } from './model.js'

/**
 * A response the services throw. Express 5 forwards a rejected promise to the error
 * middleware, so a handler only has to call the service.
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

/** Path ids arrive as strings; the store works with numbers. */
export const parseId = (raw: string): number => {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, 'VALIDATION_ERROR', `"${raw}" is not a valid id.`)
  }
  return id
}

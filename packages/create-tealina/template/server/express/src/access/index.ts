import type { RequestHandler } from 'express'
import type {
  AnyPayload,
  AuthedHandler,
  OpenHandler,
} from '../../types/handler.js'
import { verifyToken } from './verifyToken.js'

type OpenApiType = <
  const T extends [...RequestHandler[], OpenHandler<AnyPayload, any>],
>(
  ...handlers: T
) => T

type AuthedApiType = <
  const T extends [...RequestHandler[], AuthedHandler<AnyPayload, any>],
>(
  ...handlers: T
) => T

/**
 * The two ways a handler file ends: `authedApi` builds the chain with the guard,
 * `openApi` without. The call that annotates the handler decides whether a token is required.
 *
 * `openApi` refuses an `AuthedHandler` — one reading `res.locals.userId` cannot sit on a
 * public route. The converse is not caught: `authedApi(openHandler)` compiles and installs
 * the guard anyway.
 *
 * The tuple is load-bearing: `ExtractApiType` reads the payload off the last element, so a
 * rest parameter typed `CustomHandlerType[]` collapses it and projects responses to `never`.
 * The guard is prepended so the handler keeps that last position.
 */
export const openApi: OpenApiType = (...handlers) => handlers

export const authedApi: AuthedApiType = (...handlers) => {
  // In place: spreading would yield `[guard, ...T]`, which `=> T` rejects.
  handlers.unshift(verifyToken)
  return handlers
}

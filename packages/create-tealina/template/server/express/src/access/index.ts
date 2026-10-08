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
 * The two ways a handler file ends, and between them the whole public/authed decision:
 * `authedApi` builds the chain with the guard in it, `openApi` builds it without, so the
 * call that annotates the handler is the call that decides whether a token is required.
 * A third way applies the same shape: prepend another middleware instead of `verifyToken`.
 *
 * `openApi` refuses an `AuthedHandler` — a handler reading `res.locals.userId` cannot go on
 * a route anyone can call. The converse is not caught: `authedApi(openHandler)` compiles and
 * installs the guard anyway, so the route is stricter than its own types claim.
 *
 * The tuple is load-bearing. `ExtractApiType` reads a handler's payload off its last element
 * through `LastElement<T>`, so annotating the rest parameter — `(...h: CustomHandlerType[])`
 * — collapses it and projects every response to `never` with no diagnostic. `authedApi`
 * prepends the guard rather than appending it, so the handler keeps the last position that
 * `ExtractApiType` reads.
 */
export const openApi: OpenApiType = (...handlers) => handlers

export const authedApi: AuthedApiType = (...handlers) => {
  // In place so the return type stays `T`: `[verifyToken, ...handlers]` is `[guard, ...T]`,
  // which `=> T` rejects (TS2322).
  handlers.unshift(verifyToken)
  return handlers
}

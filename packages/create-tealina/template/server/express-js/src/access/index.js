import { verifyToken } from './verifyToken.js'

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
 * The imported names are the shipped declarations, not lookalikes: the projection matches
 * `HandlerAlias` itself, and a restated alias would silently widen every response to
 * `unknown`. The tuple is load-bearing the same way — `@param {...T}` collapses it to `T[]`,
 * and every response then projects to `never` with no diagnostic. `authedApi` prepends the
 * guard rather than appending it, so the handler keeps the last position `ExtractApiType` reads.
 *
 * @typedef {import('express').RequestHandler} RequestHandler
 * @typedef {import('../../types/handler.js').AnyPayload} AnyPayload
 * @typedef {[...RequestHandler[], import('../../types/handler.js').OpenHandler<AnyPayload, any>]} OpenApiArgs
 * @typedef {[...RequestHandler[], import('../../types/handler.js').AuthedHandler<AnyPayload, any>]} AuthedApiArgs
 */

/**
 * @template {OpenApiArgs} const T
 * @param {T} handlers
 * @returns {T}
 */
export const openApi = (...handlers) => handlers

/**
 * @template {AuthedApiArgs} const T
 * @param {T} handlers
 * @returns {T}
 */
export const authedApi = (...handlers) => {
  // In place so the return type stays `T`: `[verifyToken, ...handlers]` is `[guard, ...T]`,
  // which `=> T` rejects (TS2322).
  handlers.unshift(verifyToken)
  return handlers
}

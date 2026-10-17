import { verifyToken } from './verifyToken.js'

/**
 * The two ways a handler file ends: `authedApi` builds the chain with the guard,
 * `openApi` without. The call that annotates the handler decides whether a token is required.
 *
 * `openApi` refuses an `AuthedHandler` — one reading `res.locals.userId` cannot sit on a
 * public route. The converse is not caught: `authedApi(openHandler)` compiles and installs
 * the guard anyway.
 *
 * `@param {...T}` would collapse the tuple to `T[]` and project every response to `never`,
 * so `@param {T}` must carry it. The names below are the shipped declarations, not
 * lookalikes; a restated alias would widen every response to `unknown`. The guard is
 * prepended so the handler keeps the last position `ExtractApiType` reads.
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
  // In place: spreading would yield `[guard, ...T]`, which `=> T` rejects.
  handlers.unshift(verifyToken)
  return handlers
}

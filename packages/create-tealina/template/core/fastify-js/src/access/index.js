import { verifyToken } from './verifyToken.js'

/**
 * The two ways a handler file ends: `authedApi` builds the chain with the guard,
 * `openApi` without. The call that annotates the handler decides whether a token is required.
 *
 * Every request here carries `locals?: AuthedLocals` (`types/fastify.d.ts`), so neither type
 * can tell the two apart and both share `ApiArgs`; `openApi(authedHandler)` compiles.
 *
 * `@param {...T}` would collapse the tuple to `T[]` and project every response to `never`,
 * so `@param {T}` must carry it. The names below are the shipped declarations, not
 * lookalikes; a restated alias would widen every response to `unknown`. The guard is
 * prepended so the handler keeps the last position `ExtractApiType` reads.
 *
 * @typedef {import('fastify').preHandlerHookHandler | import('fastify').preHandlerAsyncHookHandler} PreHanlder
 * @typedef {[...PreHanlder[], import('../../types/handler.js').CustomHandlerType]} ApiArgs
 */

/**
 * @template {ApiArgs} const T
 * @param {T} handlers
 * @returns {T}
 */
export const openApi = (...handlers) => handlers

/**
 * @template {ApiArgs} const T
 * @param {T} handlers
 * @returns {T}
 */
export const authedApi = (...handlers) => {
  // In place: spreading would yield `[guard, ...T]`, which `=> T` rejects.
  handlers.unshift(verifyToken)
  return handlers
}

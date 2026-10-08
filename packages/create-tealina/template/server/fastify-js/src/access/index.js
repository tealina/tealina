import { verifyToken } from './verifyToken.js'

/**
 * The two ways a handler file ends, and between them the whole public/authed decision:
 * `authedApi` builds the chain with the guard in it, `openApi` builds it without.
 * A third way applies the same shape: prepend another middleware instead of `verifyToken`.
 *
 * Fastify is where that pair stops being a type check as well. `FastifyRequest` is
 * module-augmented with `locals?: AuthedLocals` (see `types/fastify.d.ts`), so the
 * intersection in `HandlerAliasCore` leaves `AuthedLocals` on every handler's request and
 * an `OpenHandler` cannot be told from an `AuthedHandler` on that field. Neither can
 * `headers`, which the constraint has to leave permissive for the same reason a payload is.
 * `CustomHandlerType` is what remains: it accepts both, so the two live in one `ApiArgs`
 * here, and `openApi(authedHandler)` compiles where express and koa reject it.
 *
 * The names below are the shipped declarations, not lookalikes: the projection matches
 * `HandlerAlias` itself, and a restated alias would silently widen every response to
 * `unknown`. The tuple is load-bearing the same way — `@param {...T}` collapses it to `T[]`,
 * and every response then projects to `never` with no diagnostic. `authedApi` prepends the
 * guard rather than appending it, so the handler keeps the last position `ExtractApiType`
 * reads.
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
  // In place so the return type stays `T`: `[verifyToken, ...handlers]` is `[guard, ...T]`,
  // which `=> T` rejects (TS2322).
  handlers.unshift(verifyToken)
  return handlers
}

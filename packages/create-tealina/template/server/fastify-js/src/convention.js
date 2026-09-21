/**
 * `CustomHandlerType` is imported rather than restated. The projection in
 * `types/handler.d.ts` recovers a handler's payload by matching the last element of the
 * tuple against `HandlerAlias<infer Info, any>` — so a locally declared lookalike would
 * satisfy the compiler and still fail to match, silently widening every response to
 * `unknown`. The alias has to be the very same declaration.
 *
 * The chain's head is fastify's own hook pair, exactly as the TypeScript tree's
 * `PreHanlder` spells it. It cannot be `CustomHandlerType`: a preHandler is not one, and
 * a callback-style hook — the third `done` parameter — is not either.
 *
 * The type parameter carries the *whole tuple*, and that is the load-bearing part:
 * annotating the rest parameter instead — `@param {...T} handlers` — collapses the tuple
 * to `T[]`, `LastElement` then hands back the array, and the projection above degrades
 * every response to `never` with no diagnostic pointing at it. The TypeScript tree writes
 * the same clause as `<const T extends ConstrainedHandlerType>(...handlers: T) => T`.
 *
 * @typedef {import('fastify').preHandlerHookHandler | import('fastify').preHandlerAsyncHookHandler} PreHanlder
 * @typedef {import('../types/handler.js').CustomHandlerType} CustomHandlerType
 * @typedef {[...PreHanlder[], CustomHandlerType]} ConstrainedHandlerType
 */

/**
 * @template {ConstrainedHandlerType} const T
 * @param {T} handlers
 * @returns {T}
 */
export const convention = (...handlers) => handlers

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
 * `@typedef` carries the `<const T>` modifier that the TypeScript tree writes as a type
 * parameter, and the tuple inference survives it: a rest parameter would widen to `T[]`
 * and take the projection with it.
 *
 * @typedef {import('fastify').preHandlerHookHandler | import('fastify').preHandlerAsyncHookHandler} PreHanlder
 * @typedef {import('../types/handler.js').CustomHandlerType} CustomHandlerType
 * @typedef {[...PreHanlder[], CustomHandlerType]} ConstrainedHandlerType
 * @typedef {<const T extends ConstrainedHandlerType>(...handlers: T) => T} EnsureHandlerType
 */

/** @type {EnsureHandlerType} */
export const convention = (...handlers) => handlers

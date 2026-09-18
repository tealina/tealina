/**
 * `CustomHandlerType` is imported rather than restated. The projection in
 * `types/handler.d.ts` recovers a handler's payload by matching the last element of the
 * tuple against `HandlerAlias<infer Info, any>` — so a locally declared lookalike would
 * satisfy the compiler and still fail to match, silently widening every response to
 * `unknown`. The alias has to be the very same declaration.
 *
 * `@typedef` carries the `<const T>` modifier that the TypeScript tree writes as a type
 * parameter, and the tuple inference survives it: a rest parameter would widen to `T[]`
 * and take the projection with it.
 *
 * @typedef {import('express').RequestHandler} RequestHandler
 * @typedef {import('../types/handler.js').CustomHandlerType} CustomHandlerType
 * @typedef {[...RequestHandler[], CustomHandlerType]} ConstrainedHandlerType
 * @typedef {<const T extends ConstrainedHandlerType>(...handlers: T) => T} EnsureHandlerType
 */

/** @type {EnsureHandlerType} */
export const convention = (...handlers) => handlers

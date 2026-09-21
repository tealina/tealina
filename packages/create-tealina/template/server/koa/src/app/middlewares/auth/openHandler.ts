import type { Middleware } from 'koa'

/**
 * The marker that makes an endpoint public: `convention(openHandler, handler)`.
 *
 * delta vs create-tealina: this file has no upstream counterpart. Upstream decides
 * which routes are public with a hand-written path table (`OpenPathRecord`) in
 * `src/app/routes/api/v1.ts`, which has to be kept in step with the handlers by hand.
 * Here an endpoint declares it for itself by carrying this marker in its handler
 * chain, and the router registers that route without `verifyToken` — the other file
 * in this directory.
 *
 * A real pass-through middleware rather than an inert placeholder, so it is safe to
 * leave in the chain: it does nothing and hands straight over to the next middleware.
 */
export const openHandler: Middleware = async (_ctx, next) => next()

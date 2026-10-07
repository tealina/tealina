/**
 * The marker that makes an endpoint public: `convention(openHandler, handler)`.
 *
 * An endpoint declares its own visibility, by carrying this marker in its handler chain,
 * rather than being listed in a path table that someone has to keep in step with the
 * handlers by hand. The router registers a marked route without `verifyToken` — the
 * other file in this directory.
 *
 * A real pass-through middleware rather than an inert placeholder, so it is safe to
 * leave in the chain: it does nothing and hands straight over to the next middleware.
 *
 * @type {import('koa').Middleware}
 */
export const openHandler = async (_ctx, next) => next()

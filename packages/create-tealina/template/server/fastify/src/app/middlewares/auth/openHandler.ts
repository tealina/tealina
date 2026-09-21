import type { preHandlerHookHandler, preHandlerAsyncHookHandler } from 'fastify'

type PreHanlder = preHandlerHookHandler | preHandlerAsyncHookHandler

/**
 * The marker that makes an endpoint public: `convention(openHandler, handler)`.
 *
 * An endpoint declares its own visibility, by carrying this marker in its handler chain,
 * rather than being listed in a path table that someone has to keep in step with the
 * handlers by hand. The router registers a marked route without `verifyToken` — the
 * other file in this directory.
 *
 * Typed as the preHandler it is: the router runs everything before the last element
 * as `preHandler`, so the marker rides in the chain like any other hook. A preHandler
 * is not a `CustomHandlerType` (fastify's hook type carries a third `done`
 * parameter), which is why the router reads its route record through a wider element
 * type — see `src/app/routes/api/v1.ts`.
 *
 * A real pass-through middleware rather than an inert placeholder, so it is safe to
 * leave in the chain: a promise-style hook that resolves without touching the reply,
 * which is fastify's way of handing straight over to the next middleware.
 */
export const openHandler: PreHanlder = async () => {}

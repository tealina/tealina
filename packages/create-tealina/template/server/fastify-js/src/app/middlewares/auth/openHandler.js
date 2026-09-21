/**
 * The marker that makes an endpoint public: `convention(openHandler, handler)`.
 *
 * delta vs create-tealina: this file has no upstream counterpart. Upstream decides
 * which routes are public with a hand-written path table (`OpenPathRecord`) in
 * `src/app/routes/api/v1.js`, which has to be kept in step with the handlers by hand.
 * Here an endpoint declares it for itself by carrying this marker in its handler
 * chain, and the router registers that route without `verifyToken` — the other file
 * in this directory.
 *
 * Typed as the preHandler it is: the router runs everything before the last element
 * as `preHandler`, so the marker rides in the chain like any other hook. A preHandler
 * is not a `CustomHandlerType` (fastify's hook type carries a third `done`
 * parameter), which is why the router reads its route record through a wider element
 * type — see `src/app/routes/api/v1.js`.
 *
 * A real pass-through middleware rather than an inert placeholder, so it is safe to
 * leave in the chain: a promise-style hook that resolves without touching the reply,
 * which is fastify's way of handing straight over to the next middleware.
 *
 * @typedef {import('fastify').preHandlerHookHandler | import('fastify').preHandlerAsyncHookHandler} PreHanlder
 */

/** @type {PreHanlder} */
export const openHandler = async () => {}

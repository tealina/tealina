import { loadAPIs, transformToRouteOptions } from '@tealina/server'

/**
 * A version barrel as `align` writes it: one entry per method, each a lazy import of that
 * method's directory. Written out rather than derived from `loadAPIs`, because a JSDoc
 * `@typedef` has no way to spell the `Parameters<typeof loadAPIs>[0]` the TypeScript tree
 * names this with.
 *
 * `transformToRouteOptions` reads a handler tuple back as a homogeneous array, so the
 * per-position types `openApi` / `authedApi` preserve are gone by the time we get here. The
 * `preHandler` slot legitimately holds hooks that are not `CustomHandlerType`: a
 * callback-style hook carries a third `done` parameter a route handler does not.
 *
 * @typedef {Record<string, Promise<{ default: any }>>} ApiBarrel
 * @typedef {import('fastify').preHandlerHookHandler | import('fastify').preHandlerAsyncHookHandler} PreHanlder
 * @typedef {import('fastify').HTTPMethods} HTTPMethods
 * @typedef {import('../../../types/handler.js').CustomHandlerType} CustomHandlerType
 * @typedef {PreHanlder | CustomHandlerType} ChainElement
 */

/**
 * Build the plugin that registers one version's routes; the prefix that version answers on
 * goes on the `register` call.
 *
 * Nothing here decides who may call what: `authedApi(handler)` hands over
 * `[verifyToken, ...]` and `openApi(handler)` the handler alone. The guard is therefore just
 * the first entry of `preHandler`, running after validation.
 *
 * Where the TypeScript tree writes `transformToRouteOptions<ChainElement[]>(...)`, this
 * annotates the argument instead. There is no JSDoc spelling for a call-site type argument,
 * and there does not need to be one: `T` is inferred from the argument, so typing the
 * argument pins it to the same thing.
 *
 * @param {ApiBarrel} apis
 * @returns {import('fastify').FastifyPluginAsync}
 */
export const buildRouter = apis => async (fastify, _option) => {
  /** @type {Record<string, Record<string, ChainElement[]>>} */
  const apiRecord = await loadAPIs(apis)
  const routeOptions = transformToRouteOptions(apiRecord)
  for (const { url, method, handler } of routeOptions) {
    fastify.route({
      url,
      method: /** @type {HTTPMethods} */ (method.toUpperCase()),
      preHandler: handler.slice(0, -1),
      // The chain's last element is always the route handler, but the widened array above
      // has lost that shape.
      handler: /** @type {CustomHandlerType} */ (handler.at(-1)),
    })
  }
}

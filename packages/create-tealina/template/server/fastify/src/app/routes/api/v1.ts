import type { FastifyPluginAsync, HTTPMethods, RouteHandler } from 'fastify'
import apisV1 from '../../../api-v1/index.js'
// import { checkMethodType, loadAPIs } from '../utils/resolveBatchExport.js'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'
import { verifyToken } from '../../preHandlers/verifyToken.js'
import type { Simplify } from '../../../../types/handler.js'

export type TakeMethodAndPathRecord<T extends Record<string, any>> = Simplify<{
  [K in keyof T]: { [N in keyof Awaited<T[K]>['default']]?: true }
}>

/**
 * APIs without the need to log in
 * Don't forget use OpenHandler to declare your handler type
 */
const OpenPathRecord: Partial<TakeMethodAndPathRecord<typeof apisV1>> = {
  get: { '/health': true },
  post: { '/login': true },
}

export const buildV1Router: FastifyPluginAsync = async (fastify, _option) => {
  // checkMethodType(apisV1)
  const apiRecord = await loadAPIs(apisV1)
  fastify.register((restrictFastify, _opts, done) => {
    restrictFastify.addHook('preValidation', verifyToken)
    const routeOptions = transformToRouteOptions<RouteHandler[]>(apiRecord)
    const rawOpenPathRecord = OpenPathRecord as Partial<
      Record<string, Partial<Record<string, true>>>
    >
    for (const { url, method, handler } of routeOptions) {
      const instance = rawOpenPathRecord[method]?.[url]
        ? fastify
        : restrictFastify
      instance.route({
        url,
        method: method.toUpperCase() as HTTPMethods,
        preHandler: handler.slice(0, -1),
        handler: handler.at(-1)!,
      })
    }
    done()
  })
}

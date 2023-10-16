import { flat, flow, groupBy, map, pipe } from 'fp-lite'
// import { catchErrorWrapper } from './catchErrorWrapper'
import { FastifyInstance, HTTPMethods, preHandlerHookHandler } from 'fastify'
import { ResolvedAPIs } from './resolveBatchExport'

const orderBySlashCount = (xs: string[] = []) =>
  xs
    .map((x: string) => x.split('/'))
    .sort((a, b) => b.length - a.length)
    .map(x => x.join('/'))

// ensure no parmas route at first
const sortRoute = flow(
  groupBy((x: string) => (x.includes(':') ? 'hasParams' : 'noParams')),
  m => [
    ...orderBySlashCount(m.get('noParams')),
    ...orderBySlashCount(m.get('hasParams')),
  ],
  flat,
)

interface RegisteOptions {
  /** you can use it for access control */
  beforeEach: preHandlerHookHandler
}

// https://www.fastify.io/docs/latest/Reference/Routes/
const registeApiRoutes = (
  allApi: ResolvedAPIs,
  fastify: FastifyInstance,
  options?: RegisteOptions,
) => {
  const { beforeEach } = options ?? {}
  const mayMergeHandler: (h: any[]) => any[] = beforeEach
    ? h => [beforeEach, ...h]
    : h => h
  Object.entries(allApi).forEach(([method, sameMethodApis]) =>
    pipe(
      Object.keys(sameMethodApis),
      sortRoute,
      map(url => {
        pipe(
          sameMethodApis[url],
          handler => (Array.isArray(handler) ? handler : [handler]),
          mayMergeHandler,
          handlers => ({
            url: `/${url}`,
            method: method.toUpperCase() as HTTPMethods,
            handler: handlers.pop(),
            preHandler: handlers,
          }),
          opt => fastify.route(opt),
        )
      }),
    ),
  )
}

export { registeApiRoutes }

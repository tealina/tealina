import { flat, flow, groupBy } from 'fp-lite'
// import { catchErrorWrapper } from './catchErrorWrapper.js'
import {
  FastifyInstance,
  HTTPMethods,
  RouteHandlerMethod,
  RouteShorthandMethod,
  preHandlerHookHandler,
} from 'fastify'
import { ResolvedAPIs } from './resolveBatchExport.js'

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

type HttpMethod = Extract<
  Lowercase<HTTPMethods>,
  'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put'
>

const ValidMethod: Record<HttpMethod, true> = {
  delete: true,
  get: true,
  head: true,
  options: true,
  patch: true,
  post: true,
  put: true,
}

const validateMethod = (key: string): HttpMethod => {
  if (key in ValidMethod) return key as HttpMethod
  throw new Error(`Invalid http method: ${key}`)
}

type RegisteEachFn = (url: string, handlers: RouteHandlerMethod) => void

const walk = (record: ResolvedAPIs[string], registeEach: RegisteEachFn) => {
  const urls = sortRoute(Object.keys(record))
  urls.forEach(url => {
    const h = record[url]
    // const handlers = [h].flat(2).map(catchErrorWrapper)
    registeEach(`/${url}`, h as any)
  })
}

type RegisterFn = (routeMather: RouteShorthandMethod) => RegisteEachFn

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
  const registeEach: RegisterFn = beforeEach
    ? matcher => (url, hanlders) =>
        matcher(url, { preHandler: beforeEach }, hanlders)
    : matcher => (url, hanlders) => matcher(url, hanlders)
  Object.entries(allApi).forEach(([dir, sameMethodApis]) => {
    const method = validateMethod(dir)
    walk(sameMethodApis, registeEach(fastify[method].bind(fastify)))
  })
}

export { registeApiRoutes }

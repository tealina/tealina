import type { RequestHandler, Router } from 'express'
import { flat, flow, groupBy } from 'fp-lite'
import { catchErrorWrapper } from './catchErrorWrapper.js'
import { ResolvedAPIs } from './resolveBatchExport.js'

const orderBySlashCount = (xs: string[] = []) =>
  xs
    .map((x: string) => x.split('/'))
    .sort((a, b) => b.length - a.length)
    .map(x => x.join('/'))

// ensure no parmas route path at first
const sortPath = flow(
  groupBy((x: string) => (x.includes(':') ? 'hasParams' : 'noParams')),
  m => [
    ...orderBySlashCount(m.get('noParams')),
    ...orderBySlashCount(m.get('hasParams')),
  ],
  flat,
)

type HttpMethod = keyof Pick<
  Router,
  | 'connect'
  | 'delete'
  | 'get'
  | 'head'
  | 'options'
  | 'patch'
  | 'post'
  | 'put'
  | 'trace'
>

const ValidMethod: Record<HttpMethod, true> = {
  connect: true,
  delete: true,
  get: true,
  head: true,
  options: true,
  patch: true,
  post: true,
  put: true,
  trace: true,
}

const validateMethod = (key: string): HttpMethod => {
  if (key in ValidMethod) return key as HttpMethod
  throw new Error(`Invalid http method: ${key}`)
}

type RegisteEachFn = (url: string, handlers: RequestHandler[]) => void

const walk = (record: ResolvedAPIs[string], registeEach: RegisteEachFn) => {
  const urls = sortPath(Object.keys(record))
  urls.forEach(url => {
    const h = record[url]
    const handlers = [h].flat(2).map(catchErrorWrapper)
    registeEach(`/${url}`, handlers)
  })
}

type RegisterFn = (routeMather: Router[HttpMethod]) => RegisteEachFn

interface RegisteOptions {
  /** you can use it for access controll */
  beforeEach: RequestHandler
}

const registeApiRoutes = (
  router: Router,
  allApi: ResolvedAPIs,
  options?: RegisteOptions,
): Router => {
  const { beforeEach } = options ?? {}
  const registeEach: RegisterFn = beforeEach
    ? matcher => (url, hanlders) => matcher(url, beforeEach, ...hanlders)
    : matcher => (url, hanlders) => matcher(url, ...hanlders)
  Object.entries(allApi).forEach(([dir, sameMethodApis]) => {
    const method = validateMethod(dir)
    walk(sameMethodApis, registeEach(router[method].bind(router)))
  })
  return router
}

export { registeApiRoutes }

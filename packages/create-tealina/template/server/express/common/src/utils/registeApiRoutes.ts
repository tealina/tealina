import type { RequestHandler, Router } from 'express'
import { flat, flow, groupBy } from 'fp-lite'
import { catchErrorWrapper } from '../middlewares/catchErrorWrapper.js'
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

const validateMethod = <T extends HttpMethod>(x: Record<T, any>) => x

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
  /** you can use it for access control */
  beforeEach: RequestHandler
}

const registeApiRoutes = (
  router: Router,
  method: string,
  sameMethodApis: Record<string, ResolvedAPIs[string][string]>,
  options?: RegisteOptions,
): Router => {
  const { beforeEach } = options ?? {}
  const registeEach: RegisterFn = beforeEach
    ? matcher => (url, hanlders) => matcher(url, beforeEach, ...hanlders)
    : matcher => (url, hanlders) => matcher(url, ...hanlders)
  walk(sameMethodApis, registeEach(router[method as HttpMethod].bind(router)))
  return router
}

export { registeApiRoutes, validateMethod }

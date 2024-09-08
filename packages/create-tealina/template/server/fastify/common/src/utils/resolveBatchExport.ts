import type { HTTPMethods } from 'fastify'
import { asyncPipe, map, waitAll } from 'fp-lite'
import type { CustomHandlerType } from '../convention.js'

const toKeyValues = <T extends Record<string, any>>(obj: T) =>
  Object.entries<T>(obj)

const loadEachMethod = <T extends Record<string, Promise<KindImps>>>([
  method,
  sameMethodApiImps,
]: [string, T[string]]) =>
  asyncPipe(
    sameMethodApiImps,
    module => toKeyValues(module.default), // module = {'user/create': import('./user/create.js')}
    map(([urlKey, handlerImp]) =>
      handlerImp.then(handlerModule => [urlKey, handlerModule.default]),
    ),
    waitAll,
    urlHandlers => [method, Object.fromEntries(urlHandlers)],
  )

type Kind2Map<T extends KindImps> = {
  [K in keyof T]: Awaited<T[K]>['default']
}
type Obj2Map<T extends BatchExportApiType<any>> = {
  [K in keyof T]: Kind2Map<Awaited<Awaited<T[K]>['default']>>
}

const checkMethodType = <K extends AllowedHttpMethod>(obj: Record<K, any>) =>
  obj

const loadAPIs = async <T extends BatchExportApiType<any>>(
  obj: T,
): Promise<Obj2Map<T>> =>
  asyncPipe(
    Promise.resolve(Object.entries(obj)),
    map(loadEachMethod),
    waitAll,
    kvs => Object.fromEntries(kvs),
  )

interface KindImps {
  [k: string]: Promise<{
    default: CustomHandlerType | ReadonlyArray<CustomHandlerType>
  }>
}

type BatchExportApiType<T extends Promise<{ default: Promise<KindImps> }>> =
  Record<string, T>

type ResolvedAPIs = Record<
  string,
  Record<string, CustomHandlerType | ReadonlyArray<CustomHandlerType>>
>

type AllowedHttpMethod = Extract<
  Lowercase<HTTPMethods>,
  'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put'
>

export { loadAPIs, checkMethodType }
export type { ResolvedAPIs, AllowedHttpMethod }

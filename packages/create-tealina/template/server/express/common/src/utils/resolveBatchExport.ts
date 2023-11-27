import { asyncPipe, map, waitAll } from 'fp-lite'
import { CustomHandlerType } from '../../types/handler.js'
import { toKeyValues } from './separateObject.js'

interface KindImps {
  [k: string]: Promise<{
    default: CustomHandlerType | ReadonlyArray<CustomHandlerType>
  }>
}

type Kind2Map<T extends KindImps> = {
  [K in keyof T]: Awaited<T[K]>['default']
}

type Obj2Map<T extends BatchExportApiType<any>> = {
  [K in keyof T]: Kind2Map<Awaited<Awaited<T[K]>['default']>>
}

type BatchExportApiType<T extends Promise<{ default: any }>> = Record<string, T>

type ResolvedAPIs = Record<
  string,
  Record<string, CustomHandlerType | ReadonlyArray<CustomHandlerType>>
>

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
    Object.fromEntries,
    urlHandlerObj => [method, urlHandlerObj],
  )

const loadAPIs = async <T extends BatchExportApiType<any>>(
  obj: T,
): Promise<Obj2Map<T>> =>
  asyncPipe(
    Promise.resolve(Object.entries(obj)),
    map(loadEachMethod),
    waitAll,
    Object.fromEntries,
  )

export { loadAPIs }
export type { ResolvedAPIs }

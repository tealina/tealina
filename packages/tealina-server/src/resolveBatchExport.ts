type Kind2Map<T extends BatchExportApiType<any>> = {
  [K in keyof T]: Awaited<T[K]>['default']
}

type Obj2Map<T extends BatchExportApiType<any>> = {
  [K in keyof T]: Kind2Map<Awaited<T[K]>['default']>
}

type BatchExportApiType<T extends Promise<{ default: any }>> = Record<string, T>

export type ResolvedAPIs<HanlderType> = Record<
  string,
  Record<string, HanlderType>
>

type RawApiRecord<T> = {
  [method: string]: Promise<{
    default: {
      [url: string]: Promise<{
        default: T
      }>
    }
  }>
}

const loadEachMethod = async <T extends RawApiRecord<any>>([
  method,
  sameMethodApiImps,
]: [string, T[string]]) => {
  const module = (await sameMethodApiImps).default
  const ps = Object.entries(module).map(([urlKey, handlerImp]) =>
    handlerImp.then(handlerModule => [urlKey, handlerModule.default]),
  )
  const kvs = await Promise.all(ps)
  const urlHandlerObj = Object.fromEntries(kvs)
  return [method, urlHandlerObj]
}

// export const loadAPIs = async <K, T extends BatchExportApiType<any>>(
//   obj: T,
// ): Promise<Obj2Map<T>> => {
export const loadAPIs = async <T extends BatchExportApiType<any>>(
  obj: T,
): Promise<Obj2Map<T>> => {
  const ps = Object.entries(obj).map(loadEachMethod)
  const kvs = await Promise.all(ps)
  return Object.fromEntries(kvs)
}

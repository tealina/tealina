import type { ResolvedAPIs } from './resolveBatchExport.js'

const groupBy = <T, K>(array: T[], keyMaker: (x: T) => K) => {
  const resultMap = new Map<K, T[]>()
  for (let i = 0; i < array.length; i++) {
    const element = array[i]
    const key = keyMaker(element)
    const container = resultMap.get(key)
    if (container == null) {
      resultMap.set(key, [element])
      continue
    }
    container.push(element)
  }
  return resultMap
}

const orderBySlashCount = (xs: string[] = []) =>
  xs
    .map((x: string) => x.split('/'))
    .sort((a, b) => b.length - a.length)
    .map(x => x.join('/'))

// ensure no parmas route path at first
const sortPath = (xs: string[]) => {
  const m = groupBy(xs, x => (x.includes(':') ? 'hasParams' : 'noParams'))
  return orderBySlashCount(m.get('noParams')).concat(
    orderBySlashCount(m.get('hasParams')),
  )
}

interface BasiRouteOption<T> {
  method: string
  url: string
  handler: T
}

/**
 * Sort and transform API records into routing options.
 */
const transformToRouteOptions = <T>(
  apiRecords: ResolvedAPIs<T>,
): BasiRouteOption<T>[] =>
  Object.entries(apiRecords).flatMap(([method, sameMethodApis]) =>
    sortPath(Object.keys(sameMethodApis)).map(url => {
      const handler = sameMethodApis[url] as T
      return { method, url, handler }
    }),
  )

export { transformToRouteOptions }

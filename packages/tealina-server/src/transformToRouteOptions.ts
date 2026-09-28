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

interface BasicRouteOption<T> {
  method: string
  url: string
  handler: T
}

/**
 * The generated barrel writes each route as the logical path — `'health'`, not
 * `'/health'` — because the call sites are the other half of that record and they read
 * better without it. A router wants the opposite: `express.Router` refuses a url that
 * does not begin with `/`. This is where the two meet.
 *
 * Idempotent by design. A project whose barrels were generated before the keys lost
 * their slash still has `'/health'` on disk, and prefixing that a second time would
 * register `//health` — a different route to the framework, not the same one.
 */
const toAbsoluteUrl = (url: string) => (url.startsWith('/') ? url : `/${url}`)

/**
 * Sort and transform API records into routing options.
 */
const transformToRouteOptions = <T>(
  oneMethodRecords: ResolvedAPIs<T>,
): BasicRouteOption<T>[] =>
  Object.entries(oneMethodRecords).flatMap(([method, sameMethodApis]) =>
    sortPath(Object.keys(sameMethodApis)).map(url => {
      const handler = sameMethodApis[url] as T
      return { method, url: toAbsoluteUrl(url), handler }
    }),
  )

export { transformToRouteOptions }

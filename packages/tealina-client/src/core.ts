declare const emptyObjectSymbol: unique symbol
export type EmptyObject = { [emptyObjectSymbol]?: never }
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}
type WideRanageRecord = Record<string, any>
export type ApiRecordShape = Record<string, WideRanageRecord>

export type GeneralRequestOption = {
  method?: string
  url?: string
  body?: unknown
  query?: unknown
  params?: unknown
}

export type PayloadType = Pick<
  GeneralRequestOption,
  'body' | 'query' | 'params'
>

export type DynamicParmasType<C> =
  | [config?: C]
  | [payload: PayloadType, config?: C]
const descendByKeyLength = (kvs: [string, unknown][]): [string, unknown][] =>
  kvs.sort((a, b) => b[0].length - a[0].length)
const replaceURL = (url: string, sortedKeyValues: [string, unknown][]) =>
  sortedKeyValues.reduce(
    (acc, [k, v]) => acc.replace(':'.concat(k), String(v)),
    url,
  )
export const transformPayload = (
  url: string,
  payload: PayloadType,
): Omit<GeneralRequestOption, 'method'> => {
  const { query, params, body, ...rest } = payload as PayloadType
  const actualUrl =
    params == null
      ? url
      : replaceURL(url, descendByKeyLength(Object.entries(params)))
  return {
    url: actualUrl,
    params,
    query,
    body,
    ...rest,
  }
}

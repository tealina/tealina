import type { PayloadType, ClientRequestContext } from './types'

const descendByKeyLength = (kvs: [string, unknown][]): [string, unknown][] =>
  kvs.sort((a, b) => b[0].length - a[0].length)

const replaceInlineParams = (
  url: string,
  sortedKeyValues: [string, unknown][],
) =>
  sortedKeyValues.reduce(
    (acc, [k, v]) => acc.replace(':'.concat(k), String(v)),
    url,
  )

export const makeContext = (
  url: string,
  method: string,
  payload: PayloadType,
): ClientRequestContext => {
  const { query, params, body } = payload
  const context: ClientRequestContext = {
    method,
    url,
    raw: { url, method, ...payload },
  }
  if (params) {
    context.url = replaceInlineParams(
      url,
      descendByKeyLength(Object.entries(params)),
    )
  }
  if (query) {
    context.url = [
      context.url,
      new URLSearchParams(query as Record<string, string>),
    ].join('?')
  }
  if (body) {
    context.body = body
  }
  return context
}

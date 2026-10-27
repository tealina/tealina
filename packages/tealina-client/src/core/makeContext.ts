import type { PayloadType, ClientRequestContext } from './types'

/**
 * The API record spells each route as the logical path — `'health'` — and the RPC proxy
 * builds one by joining property names, so the url on its way to a requester can have no
 * leading slash. A requester composing an absolute path (the scaffold's
 * `fetch(`${base}${url}`)`) needs it, so it goes back on here rather than at every call
 * site. `createReq` and `createRPC` both route through this.
 *
 * Idempotent: a caller who still writes `'/health'` keeps it, instead of getting
 * `//health`.
 */
export const toAbsoluteUrl = (url: string) =>
  url.startsWith('/') ? url : `/${url}`

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

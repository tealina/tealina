import { createRPC, createReq, type ToRPC } from '../core/index'
import type { ApiRecordShape, ClientRequestContext, ToReq } from '../core/types'

const payload2config = (payload: ClientRequestContext) => {
  const { body, raw: _ignore, ...rest } = payload
  const obj: { body?: string; url: string; method: string } = rest
  if (body != null) {
    obj.body = JSON.stringify(body)
  }
  return obj
}

const createHandler =
  <C>(requester: (url: string, config: C) => unknown) =>
  async (rawPayload: ClientRequestContext, config: C | undefined) => {
    const { url, ...rest } = payload2config(rawPayload)
    return requester(url, Object.assign(config ?? {}, rest) as C)
  }

/**
 * Create a type-safe request object,
 * with the actual request handled by Fetch.
 * @param requester the acutal handler for send request
 *
 * @example
 * ```ts
 * import { createFetchClient } from '@tealina/client'
 * import type { ApiTypesRecord } from 'server/api/v1'
 *
 * const req = createFetchClient<ApiTypesRecord, RequestInit>(async (url, config) => {
 *    const response = await fetch(url, config)
 *    const data = await response.json()
 *    return data
 * })
 * ```
 */
export const createFetchClient = <T extends ApiRecordShape, C>(
  requester: (url: string, config: C) => unknown,
) => createReq<ToReq<T, C>, C>(createHandler(requester))

export function createFetchRPC<T extends ApiRecordShape, C>(
  requester: (url: string, config: C) => unknown,
) {
  return createRPC<ToRPC<T, C>, C>(createHandler(requester))
}

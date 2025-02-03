import { createRPC, createReq, type ToRPC } from '../core/index'
import type {
  ApiClientShape,
  ApiRecordShape,
  ClientRequestContext,
  MakeReqType,
} from '../core/types'
import type {
  MakeRawAxiosReqType,
  ShapeOfAxiosReq,
  ShapeOfAxiosRes,
  ToRawRPC,
} from './types'

const payload2config = <C extends ShapeOfAxiosReq>(
  payload: ClientRequestContext,
  config?: C,
): C => {
  const { body: data, raw: _ignore, ...rest } = payload
  return {
    ...(config ?? {}),
    ...rest,
    data,
  } as any
}

const makeHandler =
  <C>(requester: (config: C) => unknown) =>
  async (
    rawPayload: ClientRequestContext,
    config: C | undefined,
  ): Promise<unknown> => {
    const payload = payload2config(rawPayload)
    return requester(Object.assign(config ?? {}, payload) as C)
  }

/**
 * Create a type-safe request object,
 * @param requester the acutal handler for send request and extra data from response
 * @example
 * ```ts
 * import { createRawAxiosRPC } from '@tealina/client
 * import { axios } from 'axios'
 * import type { AxiosRequestConfig } from 'axios'
 * import type { ApiTypesRecord } from 'server/api/v1'
 *
 * const client = createAxiosClient<ApiTypesRecord, AxiosRequestConfig>(c =>
 *  axios.request(c).then(v => v.data),
 * )
 * ```
 */
export const createAxiosClient = <
  T extends ApiClientShape,
  C extends ShapeOfAxiosReq,
>(
  requester: (config: C) => unknown,
) => createReq<MakeReqType<T, C>, C>(makeHandler(requester))

/**
 * Create a type-safe request object,
 * @param requester the acutal handler for send request, return original Axios response structure
 * @example
 * ```ts
 * import { createRawAxiosRPC } from '@tealina/client'
 * import { axios } from 'axios'
 * import type { AxiosRequestConfig, AxiosResponse } from 'axios'
 * import type { ApiTypesRecord } from 'server/api/v1'
 *
 * const client = createRawAxiosClient<ApiTypesRecord, AxiosRequestConfig,AxiosResponse>(axios.request)
 * ```
 */
export const createRawAxiosClient = <
  T extends ApiRecordShape,
  C extends ShapeOfAxiosReq,
  R extends ShapeOfAxiosRes,
>(
  requester: (config: C) => unknown,
) => createReq<MakeRawAxiosReqType<T, C, R>, C>(makeHandler(requester))

/**
 * Create a RPC style, type-safe request object,
 * @param requester the acutal handler for send request and extra data from response
 * @example
 * ```ts
 * import { createAxiosRPC } from '@tealina/client'
 * import { axios } from 'axios'
 * import type { AxiosRequestConfig } from 'axios'
 * import type { ApiTypesRecord } from 'server/api/v1'
 *
 * const client = createAxiosRPC<ApiTypesRecord, AxiosRequestConfig>(
 *  c => axios.request(c).then(v => v.data)
 * )
 * ```
 */
export function createAxiosRPC<
  T extends ApiRecordShape,
  C extends ShapeOfAxiosReq,
>(requester: (config: C) => Promise<unknown>) {
  return createRPC<ToRPC<T, C>, C>(makeHandler(requester))
}

/**
 * Create a RPC style, type-safe request object,
 * @param requester the acutal handler for send request, make sure return value is original Axios response structure
 * @example
 * ```ts
 * import { createRawAxiosRPC } from '@tealina/client'
 * import { axios } from 'axios'
 * import type { AxiosRequestConfig, AxiosResponse } from 'axios'
 * import type { ApiTypesRecord } from 'server/api/v1'
 *
 * const client = createRawAxiosRPC<ApiTypesRecord, AxiosRequestConfig, AxiosResponse>(axios.request)
 * ```
 */
export function createRawAxiosRPC<
  T extends ApiRecordShape,
  C extends ShapeOfAxiosReq,
  R extends ShapeOfAxiosRes,
>(requester: (config: C) => Promise<unknown>) {
  return createRPC<ToRawRPC<T, C, R>, C>(makeHandler(requester))
}

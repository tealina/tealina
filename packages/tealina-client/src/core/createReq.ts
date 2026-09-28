import { makeContext, toAbsoluteUrl } from './makeContext'
import type {
  ApiClientShape,
  ClientRequestContext,
  DynamicParameters,
  PayloadType,
} from './types'

/**
 * **Return a proxied object,
 * the type needs to be predefined and passed to the first generic type.**
 *
 * @param requester callback to handle request
 * @template ApiRecordShape the API record type from backend
 * @template  RequestConfig extra optional request config, like headers setup, eg: in Axios, it's AxiosRequestConfig
 * @example
 * ```ts
 * type ApiV1Shape=MakeReqType<...>
 * const req = createReq<ApiV1Shape,AxiosRequestConfig>((payload,config)=>axios.request(...))
 * ```
 */

export const createReq = <T extends ApiClientShape, RequestConfig>(
  requester: (x: ClientRequestContext, config?: RequestConfig) => unknown,
) =>
  new Proxy({} as T, {
    get:
      (_target, method: string) =>
      (url: string, ...rest: DynamicParameters<RequestConfig>) => {
        // Before the branch: the no-payload one hands the url straight over, so
        // normalizing inside `makeContext` alone would miss it.
        const absoluteUrl = toAbsoluteUrl(url)
        if (rest.length < 1) return requester({ method, url: absoluteUrl })
        const [payload, config] = rest
        const context = makeContext(absoluteUrl, method, payload as PayloadType)
        return requester(context, config)
      },
    ownKeys() {
      return [] //for disable iterate
    },
    getOwnPropertyDescriptor(_target, _prop) {
      return {
        enumerable: false,
        configurable: false,
      }
    },
  })

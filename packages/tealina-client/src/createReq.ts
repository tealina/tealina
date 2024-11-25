import {
  type ApiRecordShape,
  type GeneralRequestOption,
  type DynamicParmasType,
  transformPayload,
  type PayloadType,
} from './core'

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
const createReq = <T extends ApiRecordShape, RequestConfig>(
  requester: (x: GeneralRequestOption, config?: RequestConfig) => unknown,
) =>
  new Proxy({} as T, {
    get:
      (_target, method: string) =>
      (url: string, ...rest: DynamicParmasType<RequestConfig>) => {
        if (rest.length < 1) return requester({ method, url })
        const [payload, config] = rest
        const actualPayload = transformPayload(url, payload as PayloadType)
        return requester({ method, ...actualPayload }, config)
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

export { createReq }

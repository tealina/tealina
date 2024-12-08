import { makeContext } from './makeContext'
import type {
  ApiClientShape,
  ApiRecordShape,
  ClientRequestContext,
  FullPayload,
  MakeParameters,
  PayloadType,
  UnionToIntersection,
} from './types'

type PathToObject<
  RoutePath extends string,
  Payload extends FullPayload,
  Config,
> = RoutePath extends `${infer Head}/${infer Tail}`
  ? {
      [K in Head as K extends '' ? never : K]: PathToObject<
        Tail,
        Payload,
        Config
      >
    }
  : {
      [K in RoutePath as K extends '' ? never : K]: (
        ...args: MakeParameters<Payload, Config>
      ) => Promise<Payload['response']>
    }

type ToNest<
  OneMethodRecord extends Record<string, FullPayload>,
  Config,
  K extends keyof OneMethodRecord = keyof OneMethodRecord,
> = K extends K ? PathToObject<K & string, OneMethodRecord[K], Config> : never

export type ToRPC<ApiShape extends ApiRecordShape, Config> = {
  [Method in keyof ApiShape]: UnionToIntersection<
    ToNest<ApiShape[Method], Config>
  >
}

/**
 * **Return a proxied object,
 * the type needs to be predefined and passed to the first generic type.**
 *
 * @param requester callback to handle request
 * @template  RequestConfig extra optional request config, eg: in Axios, it's AxiosRequestConfig
 */
export const createRPC = <T extends ApiClientShape, RequestConfig>(
  requester: (x: ClientRequestContext, config?: RequestConfig) => unknown,
) => {
  const createProxy = (path: string[] = []) =>
    new Proxy<ApiClientShape>(() => {}, {
      get(_target, prop) {
        return createProxy([...path, prop as string])
      },
      apply(_target, _thisArg, args) {
        const [method, ...endpoints] = path
        const url = endpoints.join('/')
        if (args.length < 1) return requester({ method, url })
        const [payload, config] = args
        const context = makeContext(url, method, payload as PayloadType)
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
  return createProxy() as T
}

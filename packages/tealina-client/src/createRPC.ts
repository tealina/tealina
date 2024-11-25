import {
  type EmptyObject,
  type GeneralRequestOption,
  type PayloadType,
  type Simplify,
  transformPayload,
} from './core'

type FullPayload = {
  body?: unknown
  query?: unknown
  params?: unknown
  headers?: any
  response?: unknown
}

type MakeParams<Payload, Config> = Payload extends EmptyObject
  ? [config?: Config]
  : [payload: Simplify<Payload>, config?: Config]

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
        ...args: MakeParams<Omit<Payload, 'response' | 'headers'>, Config>
      ) => Promise<Payload['response']>
    }

type ToNest<
  OneMethodRecord extends Record<string, FullPayload>,
  Config,
  K extends keyof OneMethodRecord = keyof OneMethodRecord,
> = K extends K ? PathToObject<K & string, OneMethodRecord[K], Config> : never

export type ToRPC<
  ApiShape extends Record<string, Record<string, FullPayload>>,
  Config,
> = {
  [Method in keyof ApiShape]: UnionToIntersection<
    ToNest<ApiShape[Method], Config>
  >
}

/**
 * **Return a proxied object,
 * the type needs to be predefined and passed to the first generic type.**
 *
 * @param requester callback to handle request
 * @template ApiRecordShape the API record type from backend
 * @template  RequestConfig extra optional request config, eg: in Axios, it's AxiosRequestConfig
 * @example
 * ```ts
 * type ApiV1Shape=MakeReqType<...>
 * const client = createRRC<ApiV1Shape,AxiosRequestConfig>((payload,config)=>axios.request(...))
 *
 * ```
 */
export const createRPC = <T extends Record<string, any>, RequestConfig>(
  requester: (x: GeneralRequestOption, config?: RequestConfig) => unknown,
) => {
  const createProxy = (path: string[] = []) =>
    new Proxy<Record<string, any>>(() => {}, {
      get(_target, prop) {
        return createProxy([...path, prop as string])
      },
      apply(_target, _thisArg, args) {
        const [method, ...endpoints] = path
        const url = endpoints.join('/')
        if (args.length < 1) return requester({ method, url })
        const [payload, config] = args
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
  return createProxy() as ToRPC<T, RequestConfig>
}

/**
 * @ref {@link https://github.com/type-challenges/type-challenges/issues/9770}
 */
type UnionToIntersection<U> = (U extends U ? (arg: U) => void : never) extends (
  arg: infer T,
) => void
  ? T
  : never

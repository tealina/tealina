import type {
  ApiRecordShape,
  MakeParameters,
  FullPayload,
  UnionToIntersection,
} from '../core/types'

export interface ShapeOfAxiosReq<D = any> {
  url?: string
  data?: D
}

export interface ShapeOfAxiosRes<D = any> {
  data: D
}

type RawRequestFn<
  T extends Record<string, any>,
  C extends ShapeOfAxiosReq,
  R extends ShapeOfAxiosRes,
> = <K extends keyof T>(
  url: K,
  ...rest: MakeParameters<T[K], C>
) => Promise<Omit<R, 'data'> & ShapeOfAxiosRes<T[K]['response']>>
/** The response can be directly use, without response.data */

export type MakeRawAxiosReqType<
  T extends ApiRecordShape,
  C extends ShapeOfAxiosReq,
  R extends ShapeOfAxiosRes,
> = {
  [Method in keyof T]: RawRequestFn<T[Method], C, R>
}

type PathToObject<
  RoutePath extends string,
  Payload extends FullPayload,
  Config,
  R extends ShapeOfAxiosRes,
> = RoutePath extends `${infer Head}/${infer Tail}`
  ? {
      // See `core/createRPC.ts`: one level of nesting per route segment.
      [K in Head]: PathToObject<Tail, Payload, Config, R>
    }
  : {
      [K in RoutePath]: (
        ...args: MakeParameters<Payload, Config>
      ) => Promise<Omit<R, 'data'> & { data: Payload['response'] }>
    }

type ToNest<
  OneMethodRecord extends Record<string, FullPayload>,
  Config,
  R extends ShapeOfAxiosRes,
  K extends keyof OneMethodRecord = keyof OneMethodRecord,
> = K extends K
  ? PathToObject<K & string, OneMethodRecord[K], Config, R>
  : never

export type ToRawRPC<
  ApiShape extends Record<string, Record<string, FullPayload>>,
  Config,
  R extends ShapeOfAxiosRes,
> = {
  [Method in keyof ApiShape]: UnionToIntersection<
    ToNest<ApiShape[Method], Config, R>
  >
}

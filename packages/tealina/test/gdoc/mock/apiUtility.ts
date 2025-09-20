import type { DocDataKeys, Remap2ExampleType } from '@tealina/utility-types'
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

export type ModelId = {
  id: number | string
}

/** Prisma style */
export interface FindManyArgs {
  where: Record<string, any>
  take: number
  skip: number
}

export interface PageResult<T> {
  datas: T[]
  total: number
}

export interface BaseLocals {
  userId: string
}

export interface AuthHeaders {
  Authorization: string
}

// ------Types for generate doc -------

interface RawPayload {
  body?: unknown
  params?: Record<string, unknown>
  query?: Record<string, unknown>
}

type LastElement<T> = T extends ReadonlyArray<any>
  ? T extends readonly [...any, infer U]
    ? U
    : T
  : T

type ExtractRestfulAPI<T> = LastElement<T> extends ApiHandler<
  infer Payload,
  infer Response,
  infer Headers
>
  ? Simplify<Payload & { response: Response; headers: Headers }>
  : never

type b = Simplify<{ b: number } & { c: string }>

export interface ApiHandler<
  T extends RawPayload = {},
  Tresponse = null,
  Theaders extends Record<string, any> = Simplify<AuthHeaders>,
  Tlocals extends Record<string, any> = BaseLocals,
> {
  (req: any, res: any, next: any): any
}

/** `POST` API, no `query` and `params` */
export type FuncAPI<
  Tbody = null,
  Tresponse = null,
  Theaders extends Record<string, any> = AuthHeaders,
  Tlocals extends Record<string, any> = BaseLocals,
> = ApiHandler<
  Tbody extends null ? {} : { body: Tbody },
  Tresponse,
  Theaders,
  Tlocals
>

export type ResolveApiType<T extends Record<string, Promise<any>>> = {
  [K in keyof T]: ExtractRestfulAPI<Awaited<T[K]>['default']>
}

export type MakeExampleType<T> = T extends ApiHandler<
  infer P,
  infer R,
  any,
  any
>
  ? Remap2ExampleType<P & { response: R }>
  : never

type A = MakeExampleType<FuncAPI<{ query: { page: number } }>>

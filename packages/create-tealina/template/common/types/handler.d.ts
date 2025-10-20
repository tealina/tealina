import type {
  LastElement,
  PickTarget,
  RemapToExampleType,
  Simplify,
  TargetKeys,
} from '@tealina/utility-types'
import type { AuthHeaders, AuthedLocals } from './common.d.ts'
import { HandlerAliasCore } from './alias.d.ts'

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
  headers?: unknown
}

export type FullInfo = RawPayload & { response: unknown }

type EmptyLocals = {}
type EmptyObj = {}

export type HTTPMethods = 'get' | 'post' | 'patch' | 'delete'

interface HandlerAlias<
  T extends FullInfo = { response: unknown },
  TLocals extends EmptyObj = EmptyLocals,
> extends HandlerAliasCore<Omit<T, 'response'>, T['response'], TLocals> {}

export type OpenHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
  TLocals extends EmptyObj = EmptyLocals,
> = HandlerAlias<Simplify<TPayload & { response: TResponse }>, TLocals>

export type AuthedHandler<
  TPayload extends RawPayload = {},
  TResponse = unknown,
  TLocals extends EmptyObj = EmptyLocals,
> = HandlerAlias<
  Simplify<TPayload & { headers: AuthHeaders; response: TResponse }>,
  AuthedLocals & TLocals
>

type ExtractApiType<
  T,
  K extends TargetKeys,
> = LastElement<T> extends HandlerAlias<infer Info, any>
  ? PickTarget<Omit<Info, 'response'>, K> & {
      response: PickTarget<Info['response'], K>
    }
  : never

export type ResolveApiTypeForDoc<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default'], 'doc'>
}

export type ResolveApiTypeForClient<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default'], 'client'>
}

export type CustomHandlerType = HandlerAlias<any, any>

/** Takes an Handler's payload type and transforms it for example declarations. */
export type MakeExamplesType<T> = T extends HandlerAlias<infer P, any>
  ? RemapToExampleType<P>
  : never

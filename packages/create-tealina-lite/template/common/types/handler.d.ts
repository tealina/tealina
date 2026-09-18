import type {
  LastElement,
  MultiTarget,
  PickTarget,
  RemapToExampleType,
  Simplify,
  TargetKeys,
} from '@tealina/utility-types'
import type { AuthHeaders, AuthedLocals, JsonHeaders } from './common.js'
import type { HandlerAliasCore } from './alias.js'

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
  headers?: unknown
}

export type FullInfo = RawPayload & { response: unknown }

type EmptyLocals = {}
// delta vs create-tealina: exported here. Upstream keeps it module-local and the demo
// handlers import it anyway, which only compiles because TypeScript does not check
// exports of a `.d.ts` module. See test/contract-drift.test.ts.
export type EmptyObj = {}
type ShapeOfMultiTarget = MultiTarget<Record<TargetKeys, any>>
type VariantPayload = RawPayload | ShapeOfMultiTarget

export type HTTPMethods = 'get' | 'post' | 'patch' | 'delete'

interface HandlerAlias<
  T extends FullInfo = { response: unknown },
  TLocals extends EmptyObj = EmptyLocals,
> extends HandlerAliasCore<Omit<T, 'response'>, T['response'], TLocals> {}

export type OpenHandler<
  TPayload extends VariantPayload = EmptyObj,
  TResponse = unknown,
  TLocals extends EmptyObj = EmptyLocals,
> = HandlerAlias<
  Simplify<TPayload & { headers: JsonHeaders; response: TResponse }>,
  TLocals
>

export type AuthedHandler<
  TPayload extends VariantPayload = {},
  TResponse = unknown,
  TLocals extends EmptyObj = EmptyLocals,
> = HandlerAlias<
  Simplify<
    TPayload & { headers: AuthHeaders & JsonHeaders; response: TResponse }
  >,
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

type DocTargetFirst<T> = T extends ShapeOfMultiTarget
  ? Simplify<Omit<T, TargetKeys> & T['doc']>
  : T

/** Takes an Handler's payload type and transforms it for example declarations. */
export type MakeExamplesType<T> = T extends HandlerAlias<infer P, any>
  ? RemapToExampleType<DocTargetFirst<P>>
  : never

// delta vs create-tealina: a global namespace for JavaScript handlers, which have no
// `import type` and would otherwise repeat a relative import chain in every file.
// `EmptyObj` is declared again here only to make the name reachable without an import;
// it is the same type as the one this file exports above.
declare global {
  type EmptyObj = {}

  namespace Tealina {
    type Open<
      TPayload extends VariantPayload = EmptyObj,
      TResponse = unknown,
    > = OpenHandler<TPayload, TResponse>
    type Authed<
      TPayload extends VariantPayload = EmptyObj,
      TResponse = unknown,
    > = AuthedHandler<TPayload, TResponse>
  }
}

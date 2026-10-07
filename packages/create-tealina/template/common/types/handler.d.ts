// Taken from `tealina/utility-types` rather than from `@tealina/utility-types` directly,
// so the scaffold installs one package to compile its contract instead of two. `tealina`
// is already a devDependency here for the CLI, and it re-exports these.
import type {
  LastElement,
  MultiTarget,
  PickTarget,
  RemapToExampleType,
  Simplify,
  TargetKeys,
} from 'tealina/utility-types'
import type { AuthHeaders, AuthedLocals, JsonHeaders } from './common.js'
import type { HandlerAliasCore } from './alias.js'

// ---------------------------------------------------------------------------
// Shapes everything else in this file is built on
// ---------------------------------------------------------------------------

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
  headers?: unknown
}

type ShapeOfMultiTarget = MultiTarget<Record<TargetKeys, any>>
type VariantPayload = RawPayload | ShapeOfMultiTarget

type EmptyLocals = {}
// Exported because the demo handlers `import type` it — a module-local type would not be
// reachable from another file. Dropping the keyword does not reliably error, though:
// TypeScript does not check the exports of a `.d.ts` module, so this is a change that can
// go unnoticed. Keep it exported.
export type EmptyObj = {}

export type FullInfo = RawPayload & { response: unknown }

/**
 * What a handler chain's last element may be constrained to without constraining the payload
 * the handler actually declares.
 *
 * Naming a real payload in that position is not neutral. The fields a payload type leaves
 * unset come out `unknown`, `strictFunctionTypes` makes the constraint's own parameter the
 * one that has to accept the handler's, and `unknown` does not accept `ArticlePayload` — so
 * `OpenHandler` used bare rejects every handler that declares a body. The three fields are
 * `any` for that reason, and required because `?` adds an `undefined` no handler's body
 * accepts.
 *
 * `headers` is deliberately absent, which leaves `headers` and `locals` — the two things an
 * `AuthedHandler` declares differently — as the whole of what separates the kinds.
 */
export type AnyPayload = { body: any; params: any; query: any }

export type HTTPMethods = 'get' | 'post' | 'patch' | 'delete'

// ---------------------------------------------------------------------------
// The handler declarations
// ---------------------------------------------------------------------------

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

export type CustomHandlerType = HandlerAlias<any, any>

// ---------------------------------------------------------------------------
// Projections: what the doc generator and the client read
// ---------------------------------------------------------------------------

type ExtractApiType<T, K extends TargetKeys> =
  LastElement<T> extends HandlerAlias<infer Info, any>
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

type DocTargetFirst<T> = T extends ShapeOfMultiTarget
  ? Simplify<Omit<T, TargetKeys> & T['doc']>
  : T

/** Takes an Handler's payload type and transforms it for example declarations. */
export type MakeExamplesType<T> =
  T extends HandlerAlias<infer P, any>
    ? RemapToExampleType<DocTargetFirst<P>>
    : never

// ---------------------------------------------------------------------------
// Global aliases
// ---------------------------------------------------------------------------

// Aliases for JavaScript handlers.
//
// A `.js` handler has no `import type`, so without these each one would repeat a relative
// import chain. `EmptyObj` is declared again here only to make the name reachable without
// an import; it is the same type as the one this file exports above.
declare global {
  type EmptyObj = {}

  type OpenAPI<
    TPayload extends VariantPayload = EmptyObj,
    TResponse = unknown,
  > = OpenHandler<TPayload, TResponse>

  type AuthedAPI<
    TPayload extends VariantPayload = EmptyObj,
    TResponse = unknown,
  > = AuthedHandler<TPayload, TResponse>
}

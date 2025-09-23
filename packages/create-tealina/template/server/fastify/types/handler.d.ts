import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from 'fastify'
import type { AuthedLocals, AuthHeaders } from './common.js'
import type {
  MaybeProperty,
  Simplify,
  LastElement,
  ExtractResponse,
  RemapToExampleType,
} from '@tealina/utility-types'

export type EmptyObj = Record<string, unknown>

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
  headers?: unknown
}

interface ExtendedRouteHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
  TLocals = null,
  RouteGeneric extends RouteGenericInterface = {
    Body: TPayload['body']
    Headers: TPayload['headers']
    Params: TPayload['params']
    Querystring: TPayload['query']
    Reply: ExtractResponse<TResponse>
  },
> {
  (
    this: FastifyInstance,
    request: FastifyRequest<RouteGeneric> & MaybeProperty<TLocals, 'locals'>, // extend `locals` prop
    reply: FastifyReply<RouteGeneric>,
  ): RouteGeneric['Reply'] | void | Promise<RouteGeneric['Reply'] | void>
}

export type AuthedHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
  TLocals = AuthedLocals,
> = ExtendedRouteHandler<
  TPayload & { headers: AuthHeaders },
  TResponse,
  TLocals
>

export type OpenHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
> = ExtendedRouteHandler<TPayload, TResponse>

export type ExtractApiType<T> = LastElement<T> extends ExtendedRouteHandler<
  infer Payload,
  infer Response
>
  ? Simplify<Payload & { response: Response }>
  : never

export type ResolveApiType<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default']>
}

// Use `any` to maximize type matching
export type CustomHandlerType =
  | AuthedHandler<any, any, any>
  | OpenHandler<any, any>

/** Takes an Handler's payload type and transforms it for example declarations. */
export type TakePayload<T> = T extends OpenHandler<infer P, any>
  ? RemapToExampleType<P>
  : never

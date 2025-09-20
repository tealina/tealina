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
  Remap2ExampleType,
} from '@tealina/utility-types'

export type EmptyObj = Record<string, unknown>

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
}

interface ExtendedRouteHandler<
  T extends RawPayload = EmptyObj,
  Tresponse = unknown,
  Theaders = null,
  Tlocals = null,
  RouteGeneric extends RouteGenericInterface = {
    Body: T['body']
    Headers: Theaders
    Params: T['params']
    Querystring: T['query']
    Reply: ExtractResponse<Tresponse>
  },
> {
  (
    this: FastifyInstance,
    request: FastifyRequest<RouteGeneric> & MaybeProperty<Tlocals, 'locals'>, // extend `locals` prop
    reply: FastifyReply<RouteGeneric>,
  ): RouteGeneric['Reply'] | void | Promise<RouteGeneric['Reply'] | void>
}

export type AuthedHandler<
  T extends RawPayload = EmptyObj,
  Response = unknown,
  Headers extends AuthHeaders = AuthHeaders,
  Tlocals = AuthedLocals,
> = ExtendedRouteHandler<T, Response, Headers, Tlocals>

export type OpenHandler<
  T extends RawPayload = EmptyObj,
  Response = unknown,
  Headers = null,
> = ExtendedRouteHandler<T, Response, Headers>

export type ExtractApiType<T> = LastElement<T> extends ExtendedRouteHandler<
  infer Payload,
  infer Response,
  infer Headers
>
  ? Simplify<
      Payload & { response: Response } & MaybeProperty<Headers, 'headers'>
    >
  : never

export type ResolveApiType<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default']>
}

// Use `any` to maximize type matching
export type CustomHandlerType =
  | AuthedHandler<any, any, any>
  | OpenHandler<any, any, any>

export type TakePayload<T> = T extends OpenHandler<infer P, any, any>
  ? Remap2ExampleType<P>
  : never

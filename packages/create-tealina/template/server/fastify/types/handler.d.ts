import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from 'fastify'
import type { AuthedLocals, AuthHeaders } from './common.js'

export type EmptyObj = Record<string, unknown>

/** [doc](https://github.com/sindresorhus/type-fest/blob/main/source/simplify.d.ts) */
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

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
    Reply: Tresponse
  },
> {
  (
    this: FastifyInstance,
    request: FastifyRequest<RouteGeneric> & OmitEmpty<Tlocals, 'locals'>, // extend `locals` prop
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

type LastElement<T> = T extends ReadonlyArray<unknown>
  ? T extends readonly [...unknown[], infer U]
    ? U
    : T
  : T

type OmitEmpty<P, T extends string> = P extends null ? {} : { [K in T]: P }

export type ExtractApiType<T> = LastElement<T> extends ExtendedRouteHandler<
  infer Payload,
  infer Response,
  infer Headers
>
  ? Simplify<Payload & { response: Response } & OmitEmpty<Headers, 'headers'>>
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

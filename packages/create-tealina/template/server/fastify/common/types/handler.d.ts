import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
} from 'fastify'
import type { AuthHeaders, AuthedLocals } from './common.js'
import type { Simplify } from './utility.js'

export type EmptyObj = Record<string, unknown>

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
}

interface ExtendedRouteHandler<
  T extends RawPayload = EmptyObj,
  Tresponse = unknown,
  Theaders extends EmptyObj = EmptyObj,
  Tlocals extends EmptyObj = EmptyObj,
  RouteGeneric extends RouteGenericInterface = {
    Body: T['body']
    Headers: Theaders
    Reply: Tresponse
    Params: T['params']
    Querystring: T['query']
  },
> {
  (
    this: FastifyInstance,
    request: FastifyRequest<RouteGeneric> & { locals: Tlocals }, // extend `locals` prop
    reply: FastifyReply<
      RawServerDefault,
      RawRequestDefaultExpression<RawServerDefault>,
      RawReplyDefaultExpression<RawServerDefault>,
      RouteGeneric
    >,
  ): RouteGeneric['Reply'] | void | Promise<RouteGeneric['Reply'] | void>
}

// Shorter definition information when hovering
interface ShortName<
  T extends RawPayload = EmptyObj,
  Response = unknown,
  Headers extends EmptyObj = EmptyObj,
  Locals extends EmptyObj = EmptyObj,
> extends ExtendedRouteHandler<T, Response, Headers, Locals> {}

export type AuthedHandler<
  T extends RawPayload = EmptyObj,
  Response = unknown,
  Headers extends AuthHeaders = AuthHeaders,
> = ShortName<T, Response, Headers, AuthedLocals>

export type OpenHandler<
  T extends RawPayload = EmptyObj,
  Response = unknown,
  Headers extends EmptyObj = EmptyObj,
> = ShortName<T, Response, Headers>

type LastElement<T> = T extends ReadonlyArray<unknown>
  ? T extends readonly [...unknown[], infer U]
    ? U
    : T
  : T

export type ExtractApiType<T> = LastElement<T> extends ShortName<
  infer Payload,
  infer Response,
  infer Headers,
  infer _X
>
  ? Simplify<Payload & { response: Response; headers: Headers }>
  : never

export type ResolveApiType<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default']>
}

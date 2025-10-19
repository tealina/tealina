import type {
  ExtractResponse,
  LastElement,
  MaybeProperty,
  PickTarget,
  RemapToExampleType,
  Simplify,
  TargetKeys,
} from '@tealina/utility-types'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { AuthedLocals, AuthHeaders } from './common.js'

export type EmptyObj = Record<string, unknown>

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
  headers?: unknown
}

interface HandlerAlias<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
  TLocals = null,
  T = PickTarget<TPayload, 'server'>,
  R = ExtractResponse<PickTarget<TResponse, 'server'>>,
  RouteGeneric = {
    Body: T['body']
    Headers: T['headers']
    Params: T['params']
    Querystring: T['query']
    Reply: R
  },
> {
  (
    this: FastifyInstance,
    request: FastifyRequest<RouteGeneric> & MaybeProperty<TLocals, 'locals'>, // extend `locals` prop
    reply: FastifyReply<RouteGeneric>,
  ): R | void | Promise<R | void>
}

export type AuthedHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
  TLocals extends EmptyObj = EmptyObj,
> = HandlerAlias<
  TPayload & { headers: AuthHeaders },
  TResponse,
  TLocals & AuthedLocals
>

export type OpenHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
> = HandlerAlias<TPayload, TResponse>

type ExtractApiType<
  T,
  K extends TargetKeys,
> = LastElement<T> extends HandlerAlias<infer Payload, infer Response, any>
  ? Simplify<PickTarget<Payload, K> & { response: PickTarget<Response, K> }>
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

export type CustomHandlerType = HandlerAlias<any, any, any>

/** Takes an Handler's payload type and transforms it for example declarations. */
export type MakeExamplesType<T> = T extends HandlerAlias<infer P, infer R, any>
  ? RemapToExampleType<P & { response: R }>
  : never

import type { AuthHeaders, AuthedLocals } from './common'
import type { Simplify } from './utility'

interface RawPayload {
  body?: any
  params?: any
  query?: any
}

export interface AuthedHandler<
  T extends RawPayload = {},
  Tresponse = null,
  Theaders extends Record<string, any> = AuthHeaders,
  Tlocals extends Record<string, any> = AuthedLocals,
> extends OriginHandler<
    {
      Body: T['body']
      Headers: Theaders
      Reply: Tresponse
      Params: T['params']
      Querystring: T['query']
    },
    {
      /**
       * Express like locals,\
       * [ Reference ](https://github.com/fastify/fastify/issues/303)
       * */
      locals: Tlocals
    }
  > {}

export type OpenHandler<
  T extends RawPayload = {},
  Tresponse = null,
  Theaders extends Record<string, any> = {},
  Tlocals extends Record<string, any> = {},
> = AuthedHandler<T, Tresponse, Theaders, Tlocals>

type LastElement<T> = T extends ReadonlyArray<any>
  ? T extends readonly [...any, infer U]
    ? U
    : T
  : T

export type ExtractApiType<T> = LastElement<T> extends AuthedHandler<
  infer Payload,
  infer Response,
  infer Headers
>
  ? Simplify<Payload & { response: Response; headers: Headers }>
  : never

export type ResolveApiType<
  T extends Record<string, Promise<{ default: any }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default']>
}

export type CustomHandlerType =
  | AuthedHandler<any, any, any>
  | OpenHandler<any, any, any>

//prettier-ignore
import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest, FastifySchema, FastifyTypeProvider, FastifyTypeProviderDefault, RouteGenericInterface, } from 'fastify'
//prettier-ignore
import type { ContextConfigDefault, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault } from 'fastify/types/utils'
import type { ResolveFastifyReplyReturnType } from 'fastify/types/type-provider'
import type { RouteHandlerMethod } from 'fastify/types/route'

/**
 * alias of {@link RouteHandlerMethod}
 * ### difference:
 *  1. reordered the Generic types
 *  2. add Tlocals.
 */
//prettier-ignore
interface OriginHandler<
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  Tlocals extends Record<string, any> = {},
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  ContextConfig = ContextConfigDefault,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> {
  ( 
    this: FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
    request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider, ContextConfig, Logger>,
    reply: Tlocals & FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>,
    // This return type used to be a generic type argument. Due to TypeScript's inference of return types, this rendered returns unchecked.
  ): ResolveFastifyReplyReturnType<TypeProvider, SchemaCompiler, RouteGeneric>
}

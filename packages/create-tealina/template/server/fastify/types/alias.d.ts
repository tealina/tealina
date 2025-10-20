import type {
  PickTarget,
  ExtractResponse,
  MaybeProperty,
} from '@tealina/utility-types'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export interface HandlerAliasCore<
  TPayload = {},
  TResponse = unknown,
  TLocals = null,
  T = PickTarget<TPayload, 'server'>,
  R = ExtractResponse<PickTarget<TResponse, 'server'>>,
  RouteGeneric = {
    Body: T['body']
    Headers: T['headers']
    Params: T['params']
    Querystring: T['query']
    Reply: TResponse
  },
> {
  (
    this: FastifyInstance,
    request: FastifyRequest<RouteGeneric> & MaybeProperty<TLocals, 'locals'>, // extend `locals` prop
    reply: FastifyReply<RouteGeneric>,
  ): R | void | Promise<R | void>
}

// Side-effect import, so the `locals` augmentation travels with the alias that depends on
// it. A program can read a handler type without listing this directory — the web project
// compiles the contract through `server`'s exports, and the guard reads `request.locals` —
// and this is the one file all of them are guaranteed to reach.
import './fastify.js'
// Taken from `tealina/utility-types` rather than from `@tealina/utility-types` directly,
// so the scaffold installs one package to compile its contract instead of two.
import type {
  PickTarget,
  ExtractResponse,
  MaybeProperty,
} from 'tealina/utility-types'
import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  RouteGenericInterface,
} from 'fastify'

export interface HandlerAliasCore<
  TPayload extends Record<string, any> = {},
  TResponse = unknown,
  TLocals extends Record<string, any> = {},
  T extends Record<string, any> = PickTarget<TPayload, 'server'>,
  R = ExtractResponse<PickTarget<TResponse, 'server'>>,
  RouteGeneric extends RouteGenericInterface = {
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

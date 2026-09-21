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
  // The same signature, a second time, so that this is an overload set. A
  // JavaScript handler annotated with a JSDoc `@type` above its declaration is
  // otherwise checked against the alias as one signature, which makes that
  // signature the function's own — and an `async` handler is then rejected
  // outright, because a promise union is not the global `Promise` (TS1065).
  // Repeating the signature verbatim is the point: anything narrower, such as
  // `Promise<R | void>`, is also one signature of an overload set, and would
  // reject a handler that returns its payload instead of awaiting `reply.send`.
  (
    this: FastifyInstance,
    request: FastifyRequest<RouteGeneric> & MaybeProperty<TLocals, 'locals'>, // extend `locals` prop
    reply: FastifyReply<RouteGeneric>,
  ): R | void | Promise<R | void>
}

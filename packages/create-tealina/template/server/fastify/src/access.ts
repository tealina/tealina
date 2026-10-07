import type { preHandlerAsyncHookHandler, preHandlerHookHandler } from 'fastify'
import type { CustomHandlerType } from '../types/handler.js'
import { verifyToken } from './middlewares/auth/verifyToken.js'

type PreHanlder = preHandlerHookHandler | preHandlerAsyncHookHandler

type ApiType = <const T extends [...PreHanlder[], CustomHandlerType]>(
  ...handlers: T
) => T

/**
 * The two ways a handler file ends, and between them the whole public/authed decision:
 * `authedApi` builds the chain with the guard in it, `openApi` builds it without.
 * A third way applies the same shape: prepend another middleware instead of `verifyToken`.
 *
 * Fastify is where that pair stops being a type check as well. `FastifyRequest` is
 * module-augmented with `locals?: AuthedLocals` (see `types/fastify.d.ts`), so the
 * intersection in `HandlerAliasCore` leaves `AuthedLocals` on every handler's request and
 * an `OpenHandler` cannot be told from an `AuthedHandler` on that field. Neither can
 * `headers`, which the constraint has to leave permissive for the same reason a payload is.
 * `CustomHandlerType` is what remains: it accepts both, so the two live in one `ApiType`
 * here, and `openApi(authedHandler)` compiles where express and koa reject it.
 *
 * The tuple is load-bearing. `ExtractApiType` reads a handler's payload off its last element
 * through `LastElement<T>`, so annotating the rest parameter — `(...h: CustomHandlerType[])`
 * — collapses it and projects every response to `never` with no diagnostic. `authedApi`
 * prepends the guard rather than appending it, so the handler keeps the last position that
 * `ExtractApiType` reads.
 */
export const openApi: ApiType = (...handlers) => handlers

export const authedApi: ApiType = (...handlers) => {
  // In place so the return type stays `T`: `[verifyToken, ...handlers]` is `[guard, ...T]`,
  // which `=> T` rejects (TS2322).
  handlers.unshift(verifyToken)
  return handlers
}

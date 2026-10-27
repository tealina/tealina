import type { preHandlerAsyncHookHandler, preHandlerHookHandler } from 'fastify'
import type { CustomHandlerType } from '../../types/handler.js'
import { verifyToken } from './verifyToken.js'

type PreHanlder = preHandlerHookHandler | preHandlerAsyncHookHandler

type ApiType = <const T extends [...PreHanlder[], CustomHandlerType]>(
  ...handlers: T
) => T

/**
 * The two ways a handler file ends: `authedApi` builds the chain with the guard,
 * `openApi` without. The call that annotates the handler decides whether a token is required.
 *
 * Every request here carries `locals?: AuthedLocals` (`types/fastify.d.ts`), so neither type
 * can tell the two apart and both share `ApiType`; `openApi(authedHandler)` compiles.
 *
 * The tuple is load-bearing: `ExtractApiType` reads the payload off the last element, so a
 * rest parameter typed `CustomHandlerType[]` collapses it and projects responses to `never`.
 * The guard is prepended so the handler keeps that last position.
 */
export const openApi: ApiType = (...handlers) => handlers

export const authedApi: ApiType = (...handlers) => {
  // In place: spreading would yield `[guard, ...T]`, which `=> T` rejects.
  handlers.unshift(verifyToken)
  return handlers
}

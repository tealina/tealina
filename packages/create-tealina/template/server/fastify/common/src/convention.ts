import type { preHandlerHookHandler, preHandlerAsyncHookHandler } from 'fastify'
import type { AuthedHandler, OpenHandler } from '../types/handler.js'

// Use `any` to maximize type matching
type CustomHandlerType =
  | AuthedHandler<any, any, any>
  | OpenHandler<any, any, any>

type PreHanlder = preHandlerHookHandler | preHandlerAsyncHookHandler

type ConstrainedHandlerType = readonly [...PreHanlder[], CustomHandlerType]

type EnsureHandlerType = <const T extends ConstrainedHandlerType>(
  ...handlers: T
) => T

export const convention: EnsureHandlerType = (...handlers) => handlers

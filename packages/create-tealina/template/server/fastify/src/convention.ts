import type { preHandlerHookHandler, preHandlerAsyncHookHandler } from 'fastify'
import type { CustomHandlerType } from '../types/handler.js'

type PreHanlder = preHandlerHookHandler | preHandlerAsyncHookHandler

type ConstrainedHandlerType = readonly [...PreHanlder[], CustomHandlerType]

type EnsureHandlerType = <const T extends ConstrainedHandlerType>(
  ...handlers: T
) => T

export const convention: EnsureHandlerType = (...handlers) => handlers

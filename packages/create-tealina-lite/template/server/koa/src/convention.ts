import type { Middleware } from 'koa'
import type { CustomHandlerType } from '../types/handler.js'

type ConstrainedHandlerType = [...Middleware[], CustomHandlerType]

type EnsureHandlerType = <const T extends ConstrainedHandlerType>(
  ...handlers: T
) => T

export const convention: EnsureHandlerType = (...handlers) => handlers

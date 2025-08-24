import type { Middleware } from '@koa/router'
import type { CustomHandlerType } from '../types/handler.js'

type ConstrainedHandlerType = readonly [...Middleware[], CustomHandlerType]

type EnsureHandlerType = <const T extends ConstrainedHandlerType>(
  ...handlers: T
) => T

export const convention: EnsureHandlerType = (...handlers) => handlers

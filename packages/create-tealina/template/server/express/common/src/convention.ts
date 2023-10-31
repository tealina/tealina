import type { RequestHandler } from 'express'
import type { CustomHandlerType } from '../types/handler.js'

type ConstrainedHandlerType = readonly [...RequestHandler[], CustomHandlerType]

type EnsureHandlerType = <const T extends ConstrainedHandlerType>(
  ...handlers: T
) => T

export const convention: EnsureHandlerType = (...handlers) => handlers

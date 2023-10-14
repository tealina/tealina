import type { RequestHandler } from 'express'
import type { CustomHandlerType } from '../../types/handler'

type ConstraintHandlerType =
  | CustomHandlerType
  | readonly [...RequestHandler[], CustomHandlerType]

export const convention = <const T extends ConstraintHandlerType>(h: T) => h

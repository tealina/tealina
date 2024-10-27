import type { RequestHandler } from 'express'

type FuntionType = (...args: unknown[]) => unknown
type WrapTryCatch = (fn: FuntionType) => RequestHandler

export const catchErrorWrapper: WrapTryCatch = fn => (req, res, next) => {
  try {
    const p = fn(req, res, next)
    if (p instanceof Promise) {
      p.catch(e => next(e))
    }
  } catch (error) {
    next(error)
  }
}

import type { RequestHandler } from 'express'

type AsyncHandler = (...agrs: Parameters<RequestHandler>) => Promise<any>
const AsyncFunction = (async () => {}).constructor
const isAsync = (fn: any): fn is AsyncHandler => fn instanceof AsyncFunction

type WrapDotCatch = (fn: AsyncHandler) => RequestHandler
type WrapTryCatch = (fn: RequestHandler) => RequestHandler

const wrapChainCatch: WrapDotCatch = fn => (req, res, next) => {
  fn(req, res, next).catch(e => next(e))
}

const wrapTryCatch: WrapTryCatch = fn => (req, res, next) => {
  try {
    fn(req, res, next)
  } catch (error) {
    next(error)
  }
}

/**
 * catch middleware's error\
 * and pass it to `next`\
 */
const catchErrorWrapper = (fn: AsyncHandler | RequestHandler) => {
  return isAsync(fn) ? wrapChainCatch(fn) : wrapTryCatch(fn)
}

export { catchErrorWrapper }

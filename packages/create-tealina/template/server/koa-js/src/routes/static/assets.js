import serve from 'koa-static'
import path from 'node:path'

/** @param {import('koa')} app */
export const buildAssetsRouter = app => {
  app.use(serve(path.resolve('public')))
}

import type Koa from 'koa'
import serve from 'koa-static'
import path from 'node:path'

export const buildAssetsRouter = (app: Koa) => {
  app.use(serve(path.resolve('public')))
}

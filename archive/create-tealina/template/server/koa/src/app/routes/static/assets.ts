import path from 'node:path'
import pulugin4static from 'koa-static'
import type Koa from 'koa'

export const buildAssetsRouter = (app: Koa) => {
  app.use(pulugin4static(path.resolve('public')))
}

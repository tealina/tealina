import type Koa from 'koa'
import serve from 'koa-static'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('../../../public', import.meta.url))

export const buildAssetsRouter = (app: Koa) => {
  app.use(serve(publicDir))
}

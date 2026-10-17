import serve from 'koa-static'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('../../../public', import.meta.url))

/** @param {import('koa')} app */
export const buildAssetsRouter = app => {
  app.use(serve(publicDir))
}

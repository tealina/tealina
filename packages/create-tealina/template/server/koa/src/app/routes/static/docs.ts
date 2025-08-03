import {
  type TealinaVdocWebConfig,
  assembleHTML,
  getAssetsPath,
} from '@tealina/doc-ui'
import type Koa from 'koa'
import mount from 'koa-mount'
import Router from 'koa-router'
import serve from 'koa-static'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const VDOC_BASENAME = '/api-doc';

const vDocCofig: TealinaVdocWebConfig = {
  sources: [
    {
      baseURL: '/api/v1',
      jsonURL: './v1.json',
      name: 'v1',
    },
  ],
  errorMessageKey: 'message',
  features: {
    playground: {
      commonFields: {
        headers: {
          Authorization: 'string',
        },
        body: {
          skip: { type: 'number', default: 0 },
          take: { type: 'number', default: 10 },
        },
      },
    },
  },
}

const docRouter = (app: Koa) => {
  const router = new Router({ prefix: VDOC_BASENAME })
  router.get('/v1.json', async ctx => {
    const buffer = await readFile(path.resolve('docs/api-v1.json'))
    ctx.type = 'application/json'
    ctx.body = buffer
  })
  router.get('/index.html', async ctx => {
    const html = await assembleHTML(vDocCofig)
    ctx.type = 'text/html'
    ctx.body = html
  })
  app.use(router.routes())
  app.use(mount(VDOC_BASENAME, serve(getAssetsPath())))
}

export { VDOC_BASENAME, docRouter }

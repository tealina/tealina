import Router from '@koa/router'
import {
  type TealinaVdocWebConfig,
  assembleHTML,
  getAssetsPath,
} from '@tealina/doc-ui'
import type Koa from 'koa'
import mount from 'koa-mount'
import serve from 'koa-static'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { API_BASE_URL, VDOC_BASENAME } from '../version.js'

// Resolved from this module rather than from the working directory: the command that
// writes it runs in the package, but the server may be started from anywhere.
const jsonFile = fileURLToPath(new URL('../docs/api.json', import.meta.url))

const vDocCofig: TealinaVdocWebConfig = {
  sources: [
    {
      baseURL: API_BASE_URL,
      jsonURL: './api.json',
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
      },
    },
  },
}

const docRouter = (app: Koa) => {
  const router = new Router({ prefix: VDOC_BASENAME })
  router.get('/api.json', async ctx => {
    const buffer = await readFile(jsonFile)
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

export { docRouter }

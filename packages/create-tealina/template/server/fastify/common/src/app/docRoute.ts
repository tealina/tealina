import plugin4static from '@fastify/static'
import { FastifyPluginCallback } from 'fastify'
import { readFile } from 'fs/promises'
import path from 'path'
import {
  TealinaVdocWebConfig,
  VDOC_BASENAME,
  getAssetsPath,
  assembleHTML,
} from 'tealina-doc-ui'

const vDocCofig: TealinaVdocWebConfig = {
  sources: [
    {
      baseURL: '/api/v1',
      jsonURL: `${VDOC_BASENAME}/v1.json`,
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

const docRouter: FastifyPluginCallback = function (fastify, opts, done) {
  fastify.get('/hi', (req, res) => {
    res.send()
  })
  fastify.get('/v1.json', (req, res) => {
    readFile(path.resolve('docs/api-v1.json')).then(buffer => res.send(buffer))
  })
  fastify.get('/index.html', (req, res) => {
    res.type('text/html')
    assembleHTML(vDocCofig).then(html => res.send(html))
  })
  fastify.register(plugin4static, { root: getAssetsPath() })
  done()
}

export { VDOC_BASENAME, docRouter }

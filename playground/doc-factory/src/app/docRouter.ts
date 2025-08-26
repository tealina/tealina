import express, { Router } from 'express'
import path from 'node:path'
import {
  type TealinaVdocWebConfig,
  getAssetsPath,
  assembleHTML,
} from '@tealina/doc-ui'

const VDOC_BASENAME = '/api-doc'
const vDocCofig: TealinaVdocWebConfig = {
  sources: [
    {
      baseURL: '/api/v1',
      jsonURL: `${VDOC_BASENAME}/v1.json`,
    },
    {
      baseURL: '/api/v2',
      jsonURL: `${VDOC_BASENAME}/openapi.json`,
    },
  ],
  customScripts: [
    `
     window.TEALINA_VDOC_CONFIG.customRequests=[
   {
     match: (config) => config.url.includes('/health'),
     handler: (config,setResult)=>fetch(config.url).then(v=>v.text()).then(v=>{
     debugger
     setResult({statusCode:100,code:v,isError:false})
     }),
   }
 ]
    `,
  ],
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

const docRouter = Router({ caseSensitive: true })
  .get('/config.json', (req, res) => {
    res.send(vDocCofig)
  })
  .get('/index.html', (req, res, next) => {
    assembleHTML(vDocCofig).then(html => res.send(html))
  })
  .get('/v1.json', (req, res, next) => {
    res.sendFile(path.resolve('docs/api-v1.json'))
  })
  .get('/openapi.json', (req, res, next) => {
    res.sendFile(path.resolve('/Users/neo/Downloads/api.github.com.json'))
    // res.sendFile(path.resolve('docs/openapi.json'))
  })
  .use(express.static(getAssetsPath()))

export { docRouter, VDOC_BASENAME }

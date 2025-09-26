import express, { Router } from 'express'
import path from 'node:path'
import {
  type TealinaVdocWebConfig,
  getAssetsPath,
  assembleHTML,
} from '@tealina/doc-ui'
import session from 'express-session'
const VDOC_BASENAME = '/api-doc'

const vDocCofig: TealinaVdocWebConfig = {
  security: {
    authenticationWay: 'session',
    loginURL: '/api-doc/validate',
    logoutURL: '/api-doc/logout',
  },
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
  // customScripts: ['./use-fetch.js'],
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

const sessionMiddleware = session({
  secret: 'the-secret-key', // Required: used to sign the session ID cookie
  resave: false, // Prevents saving the session back to the store if not modified
  saveUninitialized: true, // Saves uninitialized sessions to the store
  cookie: {
    maxAge: 3600000,
  },
})

const docRouter = Router({ caseSensitive: true })
  .use(sessionMiddleware)
  .get('/use-fetch.js', (req, res) => {
    res.send(`
             window.TEALINA_VDOC_CUSTOM_REQUESTS=[
               {
                 match: (config) => config.url.includes('/health'),
                   handler: (config,setResult)=>fetch(config.url).then(v=>v.text()).then(result=>{
                   setResult({statusCode:100,result,isError:false})
                 }),
               }
             ]
    `)
  })
  .get('/config.json', (req, res) => {
    res.send(vDocCofig)
  })
  .get('/index.html', (req, res, next) => {
    assembleHTML(vDocCofig).then(html => res.send(html))
  })
  .get('/v1.json', (req, res, next) => {
    if (req.session.isCanAccessApiDoc) {
      res.sendFile(path.resolve('docs/api-v1.json'))
      return
    }
    if (req.headers.auth == 'xxxx') {
      res.sendFile(path.resolve('docs/api-v1.json'))
      return
    }
    res.sendStatus(401)
  })
  .get('/openapi.json', (req, res, next) => {
    res.sendFile(path.resolve('/Users/neo/Downloads/api.github.com.json'))
    // res.sendFile(path.resolve('docs/openapi.json'))
  })
  .post('/validate', (req, res, next) => {
    const { password } = req.body
    if (password == '123') {
      req.session.isCanAccessApiDoc = true
      res.sendStatus(200)
      return
    }
    if (password == 'headers') {
      res.json({ auth: 'xxxx' })
      return
    }
    res.sendStatus(401)
  })

  .post('/logout', (req, res) => {
    console.log('logout')
    delete req.session.isCanAccessApiDoc
    res.sendStatus(200)
  })
  .use(express.static(getAssetsPath()))

export { docRouter, VDOC_BASENAME }

import './config/env' /** Why next line left blank? @see {@link https://github.com/microsoft/TypeScript/pull/48330}*/

import { asyncFlow } from 'fp-lite'
import { buildApp } from './app/index'
import { VDOC_BASENAME } from './app/docRouter'

const logAddress = () => {
  console.log(`Service started at http://localhost:${process.env.PORT}`)
  console.log(
    `API document page at http://localhost:${process.env.PORT}${VDOC_BASENAME}/index.html`,
  )
}

const handleError = async (e: unknown) => {
  console.log('Service failed to start: ', e)
  process.exit(1)
}

const startServer = asyncFlow(
  buildApp,
  app => app.listen({ port: process.env.PORT }),
  logAddress,
)

startServer().catch(handleError)

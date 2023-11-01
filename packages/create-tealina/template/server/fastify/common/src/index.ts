import './config/env.js'
//Make sure this 👆 line at the top of entry file
import { asyncFlow } from 'fp-lite'
import { buildApp } from './app/index.js'
import { VDOC_BASENAME } from './app/docRoute.js'

const logAddress = async (address: string) => {
  console.log(`Server started at ${address}`)
  console.log(`API document page at ${address}${VDOC_BASENAME}/index.html`)
}

const handleError = (e: unknown) => {
  console.log('Service failed to start: ', e)
  process.exit(1)
}

const startServer = asyncFlow(
  buildApp,
  app => app.listen({ port: Number(process.env.PORT) }),
  logAddress,
)

startServer().catch(handleError)

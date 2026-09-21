import { PORT } from './config/env.js'
import { buildApp } from './app/index.js'
import { VDOC_BASENAME } from './app/routes/static/docs.js'

const logAddress = (address: string) => {
  console.log(`Service started at ${address}`)
  console.log(`API document page at ${address}${VDOC_BASENAME}/index.html`)
}

const handleError = (e: unknown) => {
  console.log('Service failed to start: ', e)
  process.exit(1)
}

const startServer = async () => {
  const app = await buildApp()
  const address = await app.listen({ port: PORT })
  logAddress(address)
}

startServer().catch(handleError)

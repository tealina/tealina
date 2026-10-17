import { PORT } from './config/env.js'
import { buildApp } from './app.js'
import { VDOC_BASENAME } from 'api-v1/mount'
import type { AddressInfo } from 'node:net'

const logAddress = (address: AddressInfo) => {
  const domain = `http://localhost:${address.port}`
  console.log(`Service started at ${domain}`)
  console.log(`API document page at ${domain}${VDOC_BASENAME}/index.html`)
}

const handleError = (e: unknown) => {
  console.log('Service failed to start: ', e)
  process.exit(1)
}

const startServer = async () => {
  const app = await buildApp()
  const server = app.listen(PORT)
  logAddress(server.address() as AddressInfo)
}

startServer().catch(handleError)

import { PORT } from './config/env.js'
import { buildApp } from './app.js'
import { VDOC_BASENAME } from 'api-v1/mount'

/** @param {import('node:net').AddressInfo} address */
const logAddress = address => {
  const domain = `http://localhost:${address.port}`
  console.log(`Service started at ${domain}`)
  console.log(`API document page at ${domain}${VDOC_BASENAME}/index.html`)
}

/** @param {unknown} e */
const handleError = e => {
  console.log('Service failed to start: ', e)
  process.exit(1)
}

const startServer = async () => {
  const app = await buildApp()
  const server = app.listen(PORT)
  logAddress(/** @type {import('node:net').AddressInfo} */ (server.address()))
}

startServer().catch(handleError)

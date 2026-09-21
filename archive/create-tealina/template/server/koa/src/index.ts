import './config/env.js'
//Make sure this 👆 line at the top of entry file
import { buildApp } from './app/index.js'
import { VDOC_BASENAME } from './app/routes/static/docs.js'
import type { AddressInfo } from 'node:net'

const logAddress = async (address: AddressInfo) => {
  const domain = `http://localhost:${address.port}`
  console.log(`Server started at ${domain}`)
  console.log(`API document page at ${domain}${VDOC_BASENAME}/index.html`)
}

const handleError = (e: unknown) => {
  console.log('Service failed to start: ', e)
  process.exit(1)
}

const startServer = async () => {
  const app = await buildApp()
  const server = app.listen(Number(process.env.PORT))
  logAddress(server.address() as AddressInfo)
}

startServer().catch(handleError)

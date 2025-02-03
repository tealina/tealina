import './config/env.js'
//Make sure this 👆 line at the top of entry file
import { buildApp } from './app/index.js'
import { VDOC_BASENAME } from './app/routes/static/docs.js'

const logAddress = async (address: string) => {
  console.log(`Server started at ${address}`)
  console.log(`API document page at ${address}${VDOC_BASENAME}/index.html`)
}

const handleError = (e: unknown) => {
  console.log('Service failed to start: ', e)
  process.exit(1)
}

const startServer = async () => {
  const app = await buildApp()
  const address = await app.listen({ port: Number(process.env.PORT) })
  logAddress(address)
}

startServer().catch(handleError)

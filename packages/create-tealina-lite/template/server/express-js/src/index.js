import { PORT } from './config/env.js'
import { buildApp } from './app/index.js'
import { VDOC_BASENAME } from './app/routes/static/doc.js'

const logAddress = () => {
  console.log(`Service started at http://localhost:${PORT}`)
  console.log(
    `API document page at http://localhost:${PORT}${VDOC_BASENAME}/index.html`,
  )
}

/** @param {unknown} e */
const handleError = e => {
  console.log('Service failed to start: ', e)
  process.exit(1)
}

const startServer = async () => {
  const app = await buildApp()
  app.listen(PORT)
  logAddress()
}

startServer().catch(handleError)

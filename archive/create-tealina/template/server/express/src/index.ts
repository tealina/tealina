import './config/env.js'
//Make sure this 👆 line at the top of entry file
import { VDOC_BASENAME } from './app/routes/static/doc.js'
import { buildApp } from './app/index.js'

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

const startServer = async () => {
  const app = await buildApp()
  app.listen(process.env.PORT)
  logAddress()
}

startServer().catch(handleError)

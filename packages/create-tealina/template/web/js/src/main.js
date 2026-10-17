import { req } from './api/client'

/**
 * One call, and the whole arrangement on display. `isOk` is a `boolean` here because the
 * server's `GET /health` handler annotates its response that way — and nothing on this
 * side writes the type down. There is no annotation here to keep in step with the
 * handler: rename the field over there and this line stops compiling.
 */
const health = await req.get('health')
const isOk = health.isOk

const app = document.querySelector('#app')
if (app == null) throw new Error('#app is missing from index.html')
app.textContent = `server health: ${isOk}`

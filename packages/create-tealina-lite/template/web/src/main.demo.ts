import { req } from './api/client'

/**
 * One call, and the whole arrangement on display. `isOk` is a `boolean` here because the
 * server's `GET /health` handler annotates its response that way — and the annotation
 * below is what holds it to that. Break the contract import or witness the shape wrongly
 * and `isOk` arrives as `unknown`, failing this line rather than rendering `undefined`.
 */
const health = await req.get('/health')
const isOk: boolean = health.isOk

const app = document.querySelector('#app')
if (app == null) throw new Error('#app is missing from index.html')
app.textContent = `server health: ${isOk}`

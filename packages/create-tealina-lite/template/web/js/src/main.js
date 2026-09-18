import { base } from './api/client'

/**
 * The page Vite serves, and deliberately almost nothing: what this scaffold demonstrates
 * is not a UI, it is the client next door.
 *
 * `req` in `./api/client` is typed from the server's own handlers. Every method, url,
 * payload and response arrives from the server through the `server` package's
 * `exports["./api/v1"]`, so the first call you write is checked against the server the
 * moment you write it:
 *
 *     import { req } from './api/client'
 *
 *     const health = await req.get('/health')
 *     const isOk = health.isOk   // the server's boolean, not a copy of it
 *
 * There is nothing to call yet. `src/api-v1/index.js` is the route table and it starts
 * empty — a demo endpoint dropped into a project that already has routes is a route nobody
 * asked for. Write one (`npm run v1 get/health && npm run align`) and the call above
 * compiles; name a route the server does not have and it does not, which is the point of
 * the whole arrangement.
 */
const app = document.querySelector('#app')
if (app == null) throw new Error('#app is missing from index.html')
app.textContent = `tealina frontend ready — the api is proxied at ${base}`

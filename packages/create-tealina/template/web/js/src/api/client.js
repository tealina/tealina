import { createFetchClient } from '@tealina/client'
import { API_BASE_URL } from 'api-v1/version'

/** @typedef {import('api-v1/api').ApiTypesForClient} ApiTypesForClient */

/**
 * The API record is a type, and a JavaScript call site cannot carry type arguments — so
 * it is handed over as a value that is only ever read as a type. See `ShapeWitness` in
 * `@tealina/client`.
 *
 * The cast is load-bearing. Written as `const apiShape = undefined` the annotation is
 * discarded along with the initializer, and the whole projection degrades to `unknown`
 * without one word of complaint from the compiler.
 *
 * @typedef {import('@tealina/client').ShapeWitness<ApiTypesForClient>} ApiShape
 */

/** @type {ApiShape} */
const apiShape = /** @type {ApiShape} */ (undefined)

/**
 * Where the backend mounts its API. Read from the api package rather than written again
 * here: the mount and this client have to name the same prefix.
 *
 * Kept relative so that the server can serve the built page on one origin. In dev it is
 * the proxy in `vite.config.js` that reaches this, not the page's own origin.
 */
export const base = API_BASE_URL

/**
 * Sent as-is when it is not empty. The scaffold's `verifyToken` only checks that the
 * header exists, so any token gets through; `POST /login` is the open endpoint that
 * hands one out. See the README for the login-then-call shape.
 *
 * @type {string}
 */
let token = ''

/** @param {string} next */
export const setToken = next => {
  token = next
}

/**
 * @param {string} url
 * @param {RequestInit} config
 */
const requester = async (url, config) => {
  const headers = new Headers(config.headers)
  headers.set('Content-Type', 'application/json')
  if (token !== '') headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${base}${url}`, { ...config, headers })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  return response.json()
}

/**
 * Every path, payload and response below is checked against the server's handlers:
 * `ApiTypesForClient` is derived from their annotations and arrives through the `api-v1`
 * package's `exports["./api"]`, so there is no second declaration of the API here to
 * keep in step. Change a handler's response and this call site stops compiling.
 */
export const req = createFetchClient(requester, apiShape)

// Prefer axios? Put `axios` in this package's dependencies and swap the factory:
//
//   import axios from 'axios'
//   import { createAxiosRPC } from '@tealina/client'
//
//   export const rpc = createAxiosRPC(
//     config => axios.request(config).then(response => response.data),
//     apiShape,
//   )
//
// `createAxiosReq` is the axios spelling of `req` above, and takes `apiShape` the same way.

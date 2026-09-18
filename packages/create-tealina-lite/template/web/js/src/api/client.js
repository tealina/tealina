import { createFetchClient } from '@tealina/client'

/** @typedef {import('server/api/v1').ApiTypesForClient} ApiTypesForClient */

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
 * Where the server mounts its API — see `src/app/routes/api/index.ts`. Read by
 * `src/main.js`, which puts it on the page.
 */
export const base = '/api/v1'

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
 * `ApiTypesForClient` is derived from their annotations and arrives through the `server`
 * package's `exports["./api/v1"]`, so there is no second declaration of the API here to
 * keep in step. Change a handler's response and this call site stops compiling.
 */
export const req = createFetchClient(requester, apiShape)

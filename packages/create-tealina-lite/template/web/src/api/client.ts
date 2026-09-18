import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'server/api/v1'

/**
 * Where the server mounts its API — see `src/app/routes/api/index.ts`. Read by
 * `src/main.ts`, which puts it on the page.
 */
export const base = '/api/v1'

/**
 * Sent as-is when it is not empty. The scaffold's `verifyToken` only checks that the
 * header exists, so any token gets through; `POST /login` is the open endpoint that
 * hands one out. See the README for the login-then-call shape.
 */
let token = ''

export const setToken = (next: string) => {
  token = next
}

const requester = async (url: string, config: RequestInit) => {
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
export const req = createFetchClient<ApiTypesForClient, RequestInit>(requester)

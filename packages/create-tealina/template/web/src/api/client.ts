import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'server/api/v1'

/**
 * Where the server mounts its API — see `src/app/routes/api/index.ts`. Read by
 * `src/main.ts`, which puts it on the page.
 *
 * Kept relative so that the server can serve the built page on one origin. In dev it is
 * the `/api` proxy in `vite.config.ts` that reaches this, not the page's own origin.
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

// Prefer axios? Put `axios` in this package's dependencies and swap the factory:
//
//   import axios from 'axios'
//   import type { AxiosRequestConfig } from 'axios'
//   import { createAxiosRPC } from '@tealina/client'
//
//   export const rpc = createAxiosRPC<ApiTypesForClient, AxiosRequestConfig>(
//     config => axios.request(config).then(response => response.data),
//   )
//
// `createAxiosReq` is the axios spelling of `req` above. Its instance does with `baseURL`
// and an interceptor what `requester` does by hand.

/**
 * `ApiTypesForClient` reaches `req` only as an argument type, so a function taking a
 * payload it did not build has nothing to annotate itself with. These name one piece of
 * one endpoint by the method and path — the same pair the call is written with, as in
 * `TakeBody<'post', 'article'>`.
 *
 * Both parameters are constrained against the record, so a method or path the server does
 * not answer fails where the type is written rather than at the call.
 */

/** What the endpoint answers with. Every endpoint has one. */
export type TakeResponse<
  Method extends keyof ApiTypesForClient,
  Path extends keyof ApiTypesForClient[Method],
> = ApiTypesForClient[Method][Path]['response']

/**
 * The payloads an endpoint can declare. One it does not declare comes back `never`, which
 * is the honest answer: there is nothing there, so a value claiming to be one cannot be
 * passed anywhere.
 */
export type TakeBody<
  Method extends keyof ApiTypesForClient,
  Path extends keyof ApiTypesForClient[Method],
> = ApiTypesForClient[Method][Path] extends { body: infer B } ? B : never

export type TakeQuery<
  Method extends keyof ApiTypesForClient,
  Path extends keyof ApiTypesForClient[Method],
> = ApiTypesForClient[Method][Path] extends { query: infer Q } ? Q : never

export type TakeParams<
  Method extends keyof ApiTypesForClient,
  Path extends keyof ApiTypesForClient[Method],
> = ApiTypesForClient[Method][Path] extends { params: infer P } ? P : never

/** The headers the endpoint is written with — json on an open one, plus `Authorization`. */
export type TakeHeaders<
  Method extends keyof ApiTypesForClient,
  Path extends keyof ApiTypesForClient[Method],
> = ApiTypesForClient[Method][Path]['headers']

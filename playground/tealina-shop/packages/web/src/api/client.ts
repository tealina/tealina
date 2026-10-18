import { createFetchClient } from '@tealina/client'
import type { ApiTypesForClient } from 'api-v1/api'
import { API_BASE_URL } from 'api-v1/version'

/**
 * Where the backend mounts its API. Read from the api package rather than written again
 * here: the mount and this client have to name the same prefix.
 */
export const base = API_BASE_URL

const kTokenKey = 'tealina-shop.token'

let token = ''

export const setToken = (next: string) => {
  token = next
  try {
    if (next === '') localStorage.removeItem(kTokenKey)
    else localStorage.setItem(kTokenKey, next)
  } catch {
    // private mode, or storage disabled — the in-memory token still works this session
  }
}

export const restoreToken = () => {
  try {
    token = localStorage.getItem(kTokenKey) ?? ''
  } catch {
    token = ''
  }
  return token
}

/** The server's error body, raised as an exception by every `req.*` call. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const requester = async (url: string, config: RequestInit) => {
  const headers = new Headers(config.headers)
  if (config.body != null) headers.set('Content-Type', 'application/json')
  if (token !== '') headers.set('Authorization', `Bearer ${token}`)

  // The client names the method with the property used to call it (`req.patch` →
  // `patch`). Fetch uppercases GET, POST, PUT, DELETE, HEAD and OPTIONS itself but
  // forwards PATCH as written, and the server rejects an unknown lowercase method.
  const response = await fetch(`${base}${url}`, {
    ...config,
    method: config.method?.toUpperCase(),
    headers,
  })
  if (response.status === 204) return undefined

  const contentType = response.headers.get('content-type') ?? ''
  // `GET /orders/export` declares a `Blob` to the client. A response the browser is
  // told to download is that blob; everything else that is not JSON stays text.
  const isDownload = response.headers
    .get('content-disposition')
    ?.includes('attachment')
  const payload: unknown = contentType.includes('application/json')
    ? await response.json()
    : isDownload === true
      ? await response.blob()
      : await response.text()

  if (!response.ok) {
    const body =
      typeof payload === 'object' && payload != null
        ? (payload as { code?: string; message?: string })
        : {}
    if (response.status === 401) setToken('')
    throw new ApiError(
      response.status,
      body.code ?? 'HTTP_ERROR',
      body.message ?? response.statusText,
    )
  }
  return payload
}

/**
 * Every path, payload and response below is checked against the server's handlers:
 * `ApiTypesForClient` is derived from their annotations and arrives through the
 * `api-v1` package's `exports["./api"]`, so there is no second declaration of the API
 * here to keep in step.
 */
export const req = createFetchClient<ApiTypesForClient, RequestInit>(requester)

/** What the endpoint answers with. */
export type TakeResponse<
  Method extends keyof ApiTypesForClient,
  Path extends keyof ApiTypesForClient[Method],
> = ApiTypesForClient[Method][Path]['response']

/** The payloads an endpoint can declare. One it does not declare is `never`. */
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

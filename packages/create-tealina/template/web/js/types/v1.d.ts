import type { ApiTypesForClient } from 'server/api/v1'

/**
 * The `Take*` names for the v1 contract. A `.js` file names one by path and calls it with
 * its arguments: `import('../types/v1').TakeBody<'post', 'article'>`.
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

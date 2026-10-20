/**
 * The projection probes, used by T1 (`contract.test.ts`).
 *
 * T1 compiles a probe against the types derived from the shipped template, and the
 * mutation self-check is the same construct. Keeping the probe here means the fixture
 * and the self-check cannot drift apart, which is exactly the failure a self-check
 * exists to prevent.
 *
 * The probe asserts the projections rather than merely importing them: without those
 * assertions it would be a false green, because `ExtractApiType` can degrade to `never`
 * without a single compiler error.
 *
 * Every specifier below is written for a probe sitting at the *fixture root*, next to
 * `types/` and `src/`. T1 places it there.
 */

export const PROBE_TS = `import type { ApiTypesForClient, ApiTypesForDoc } from './types/api.js'

type Doc = ApiTypesForDoc['get']['health']
export const docOk: Doc['response'] = { isOk: true }
// @ts-expect-error response is { isOk: boolean }
export const docBad: Doc['response'] = { isOk: 'nope' }

type Client = ApiTypesForClient['post']['login']
export const loginOk: Client['body'] = { account: 'a', password: 'b' }
// @ts-expect-error password is required
export const loginBad: Client['body'] = { account: 'a' }

// The authed POST is the only demo carrying a request body *and* a typed response,
// so it has to be asserted on both projections. Delete get/status without this and
// the AuthedHandler usage ships with no coverage at all.
type NewArticle = ApiTypesForClient['post']['article']
export const articleOk: NewArticle['body'] = { title: 't', content: 'c' }
// @ts-expect-error content is required
export const articleBad: NewArticle['body'] = { title: 't' }
// @ts-expect-error id is a number
export const articleRespBad: NewArticle['response'] = { id: 'nope' }

type ArticleDoc = ApiTypesForDoc['post']['article']
export const articleDoc: ArticleDoc['response'] = { id: 1 }
`

/**
 * `openApi` / `authedApi` rewritten to the shape the shipped pair would have if someone
 * annotated the rest parameter instead of the whole tuple — the mistake this design is
 * most exposed to, and the one no compiler error points at. Returned as a plain array,
 * the per-endpoint tuple is lost: `LastElement` hands back the array itself, an array is
 * not a `HandlerAlias`, and so `ExtractApiType` degrades to `never`.
 *
 * Used only to prove the probe can still see that. Its specifiers are written from
 * `core/src/access/`, where the shipped module it replaces sits.
 */
export const WIDENED_ACCESS = `import type { CustomHandlerType } from '../../types/handler.js'

type EnsureHandlerType = (
  ...handlers: CustomHandlerType[]
) => CustomHandlerType[]

export const openApi: EnsureHandlerType = (...handlers) => handlers

export const authedApi: EnsureHandlerType = (...handlers) => handlers
`

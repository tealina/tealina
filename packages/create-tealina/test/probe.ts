/**
 * The projection probes, shared by T1 (`contract.test.ts`) and T5 (`init.test.ts`).
 *
 * Both compile a probe against the same derived types — T1 against the shipped template,
 * T5 against the copy `init` installed into a host — and the mutation self-check is the
 * same construct in both. Keeping them here means a change to the probe cannot leave one
 * arm weaker than the other, which is exactly the failure a self-check exists to prevent.
 *
 * `PROBE_JS` does not merely import the projections — it asserts them. Without those
 * assertions the JavaScript arms would be a false green, because `ExtractApiType` can
 * degrade to `never` without a single compiler error.
 *
 * Every specifier below is written for a probe sitting at the *fixture root*, next to
 * `types/` and `src/`. Both callers place it there.
 */

export const PROBE_TS = `import type { ApiTypesForClient, ApiTypesForDoc } from './types/api-v1.js'

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
 * The same assertions, spelled the way a checked `.js` file has to spell them. Every
 * positive case is a bare `@type` with no suppression anywhere near it — that is what
 * makes it able to fail.
 *
 * `@ts-expect-error` is not used on this side for the same reason: it is a weak probe.
 * Under `never` the "wrong" assignment genuinely is an error, so the directive is legally
 * consumed and the file stays clean. The only construct that catches the degradation is
 * the unsuppressed positive assignment, which is why the negative cases are simply
 * dropped rather than transliterated — they would add lines that cannot fail.
 */
export const PROBE_JS = `/**
 * @typedef {import('./types/api-v1.js').ApiTypesForDoc} ApiTypesForDoc
 * @typedef {import('./types/api-v1.js').ApiTypesForClient} ApiTypesForClient
 */

/** @type {ApiTypesForDoc['get']['health']['response']} */
export const docOk = { isOk: true }

/** @type {ApiTypesForClient['post']['login']['body']} */
export const loginOk = { account: 'a', password: 'b' }

/** @type {ApiTypesForClient['post']['article']['body']} */
export const articleOk = { title: 't', content: 'c' }

/** @type {ApiTypesForDoc['post']['article']['response']} */
export const articleDoc = { id: 1 }
`

/**
 * `convention` rewritten to the shape the shipped one would have if someone annotated the
 * rest parameter instead of the whole tuple — the mistake this design is most exposed to,
 * and the one no compiler error points at. Returned as a plain array, the per-endpoint
 * tuple is lost: `LastElement` hands back the array itself, an array is not a
 * `HandlerAlias`, and so `ExtractApiType` degrades to `never`.
 *
 * Used only to prove the probe can still see that. It is the `convention` of a
 * *JavaScript* tree, so it only replaces a `.js` one.
 */
export const WIDENED_CONVENTION = `/**
 * @typedef {import('../types/handler.js').CustomHandlerType} CustomHandlerType
 * @typedef {(...handlers: CustomHandlerType[]) => CustomHandlerType[]} EnsureHandlerType
 */

/** @type {EnsureHandlerType} */
export const convention = (...handlers) => handlers
`

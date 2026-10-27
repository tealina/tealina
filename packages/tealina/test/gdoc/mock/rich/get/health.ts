// The point of this fixture: these two wrappers come from the published
// `@tealina/utility-types`, so the document generator is reading the real
// `ResponseFlagSymbol`, not a local imitation of it.
import type { WithHeaders, WithStatusCode } from '@tealina/utility-types'

import { ApiHandler } from '../../apiUtility.js'

type ApiType = ApiHandler<
  {},
  | WithStatusCode<201, { ok: boolean }>
  | WithHeaders<{ 'x-token': string }, { id: number }>
>

const handler: ApiType = () => {}

export default handler

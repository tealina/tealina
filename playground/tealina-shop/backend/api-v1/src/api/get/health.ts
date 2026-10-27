import type { EmptyObj, OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { getHealth, type Health } from 'core/services'
import type { WithStatusCode } from 'tealina/utility-types'

type ApiType = OpenHandler<EmptyObj, WithStatusCode<200, Health>>

/**
 * Liveness probe. Public, so a deploy or a load balancer can hit it without a token.
 */
const handler: ApiType = async (_req, res) => {
  res.send(getHealth())
}

export default openApi(handler)

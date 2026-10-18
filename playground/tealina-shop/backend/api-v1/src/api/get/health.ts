import type { EmptyObj, OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import type { WithStatusCode } from 'tealina/utility-types'

interface Health {
  /** Always "ok" while the process is answering. */
  status: 'ok'
  service: string
  /** ISO timestamp of the response. */
  time: string
}

type ApiType = OpenHandler<EmptyObj, WithStatusCode<200, Health>>

/**
 * Liveness probe. Public, so a deploy or a load balancer can hit it without a token.
 */
const handler: ApiType = async (_req, res) => {
  res.send({
    status: 'ok',
    service: 'tealina-shop',
    time: new Date().toISOString(),
  })
}

export default openApi(handler)

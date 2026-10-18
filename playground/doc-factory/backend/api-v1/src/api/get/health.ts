import type { EmptyObj, OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import type { WithStatusCode } from 'tealina/utility-types'

type ApiType = OpenHandler<EmptyObj, WithStatusCode<200, { status: string }>>

/**
 *  Check server is ok
 */
const handler: ApiType = async (_req, res) => {
  res.send({ status: 'Fine' })
}

export default openApi(handler)

import type { EmptyObj, AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import { getMe, type PublicUser } from 'core/services'

type ApiType = AuthedHandler<EmptyObj, PublicUser>

/**
 * The signed-in user. The storefront calls this once on load to restore a session.
 */
const handler: ApiType = async (_req, res) => {
  res.send(getMe(res.locals))
}

export default authedApi(handler)

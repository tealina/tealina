import type { EmptyObj, AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { PublicUser } from '../../model.js'
import { HttpError } from '../../http.js'
import { findUserById, publicUser } from '../../store/index.js'

type ApiType = AuthedHandler<EmptyObj, PublicUser>

/**
 * The signed-in user. The storefront calls this once on load to restore a session.
 */
const handler: ApiType = async (_req, res) => {
  const user = findUserById(Number(res.locals.userId))
  if (user == null) {
    throw new HttpError(
      401,
      'UNAUTHORIZED',
      'The account behind this token no longer exists.',
    )
  }
  res.send(publicUser(user))
}

export default authedApi(handler)

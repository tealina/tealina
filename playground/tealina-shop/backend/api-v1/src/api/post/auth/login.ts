import type { OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { issueToken } from 'core/auth'
import type { LoginResult } from '../../../model.js'
import { HttpError } from '../../../http.js'
import { authenticate, publicUser } from '../../../store/index.js'

export interface LoginPayload {
  /** Seed accounts are listed in the project README. */
  email: string
  password: string
}

type ApiType = OpenHandler<{ body: LoginPayload }, LoginResult>

/**
 * Exchange an email and password for a signed token (eight hours, demo secret).
 *
 * The storefront stores the token and sends it as `Authorization: Bearer …` on every
 * subsequent call.
 */
const handler: ApiType = async (req, res) => {
  const user = authenticate(req.body.email, req.body.password)
  if (user == null) {
    throw new HttpError(
      401,
      'UNAUTHORIZED',
      'That email and password do not match an account.',
    )
  }
  res.send({
    token: issueToken({ sub: String(user.id), role: user.role }),
    user: publicUser(user),
  })
}

export default openApi(handler)

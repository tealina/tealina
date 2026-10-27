import type { OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { login, type LoginResult } from 'core/services'

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
  res.send(login(req.body))
}

export default openApi(handler)

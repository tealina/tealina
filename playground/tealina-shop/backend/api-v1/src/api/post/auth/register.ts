import type { OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { issueToken } from 'core/auth'
import type { WithStatusCode } from 'tealina/utility-types'
import type { LoginResult } from '../../../model.js'
import { publicUser, registerUser } from '../../../store/index.js'

export interface RegisterPayload {
  /** At least two characters. */
  name: string
  email: string
  /** At least six characters; stored as written, because this is a demo. */
  password: string
}

type ApiType = OpenHandler<
  { body: RegisterPayload },
  WithStatusCode<201, LoginResult>
>

/**
 * Create a customer account and return a token, so the page does not ask twice.
 */
const handler: ApiType = async (req, res) => {
  const user = registerUser(req.body)
  res.status(201).send({
    token: issueToken({ sub: String(user.id), role: user.role }),
    user: publicUser(user),
  })
}

export default openApi(handler)

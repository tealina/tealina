import type { OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { register, type LoginResult } from 'core/services'
import type { WithStatusCode } from 'tealina/utility-types'

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
  res.status(201).send(register(req.body))
}

export default openApi(handler)

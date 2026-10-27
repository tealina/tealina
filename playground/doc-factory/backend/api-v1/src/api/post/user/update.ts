import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { Pure } from '../../../../types/pure.js'

type ApiType = AuthedHandler<
  {
    body: Pure.UserUpdateInput
  },
  Pure.User
>

/**
 * Update a user; every field of the payload is optional
 */
const handler: ApiType = async (req, res) => {
  const {
    name = 'Tealina',
    skills = [] as unknown as Pure.User['skills'],
    email = 'neo@tealina.dev',
  } = req.body
  res.send({ name, email, id: 1, skills })
}

export default authedApi(handler)

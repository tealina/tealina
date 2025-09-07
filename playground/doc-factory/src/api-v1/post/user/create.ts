import { AuthedHandler } from '../../../../types/handler.js'
import { Pure } from '../../../../types/pure.js'

type ApiType = AuthedHandler<
  {
    body: Pure.UserCreateInput
  },
  Pure.User
>

/**
 * Create a use
 */
const handler: ApiType = async (req, res) => {
  const { name = null, email, skills } = req.body
  res.send({ name, email, skills, id: 1 })
}

export default handler

import { AuthedHandler } from '../../../../types/handler.js'
import { Pure } from '../../../../types/pure.js'

type ApiType = AuthedHandler<
  {
    body: Pure.UserUpdateInput
  },
  Pure.User
>

const handler: ApiType = async (req, res) => {
  const {
    name = 'Tealina',
    skills = [] as unknown as Pure.User['skills'],
    email = 'neo@tealina.dev',
  } = req.body
  res.send({ name, email, id: 1, skills })
}

export default handler

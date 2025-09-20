import { AuthedHandler, MakeExamplesType } from '../../../../types/handler.js'
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

export const examples: MakeExamplesType<ApiType> = {
  body: [
    {
      key: 'default',
      summary: 'basic create',
      value: { email: 'neo@tealina.dev', skills: 'Node' },
    },
    {
      key: 'case 2',
      summary: 'create case 2',
      value: { email: 'yeo@tealina.dev', skills: 'Typescript' },
    },
  ],
  response: { email: 'neo@tealina.dev', skills: 'Node', id: 1, name: 'Neo' },
}

import { AuthedHandler } from '../../../../types/handler.js'

interface UserCreateInput {
  name: string
  age: number
  extra: Record<string, any>
}

type ApiType = AuthedHandler<
  {
    body: UserCreateInput
  },
  UserCreateInput
>

const handler: ApiType = async (req, res) => {
  res.send(req.body)
}

export default handler

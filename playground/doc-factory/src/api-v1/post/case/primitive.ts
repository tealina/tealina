import { AuthedHandler } from '../../../../types/handler.js'

interface Input {
  isOk: boolean
  /** @default {true} */
  isFine: boolean
}

type ApiType = AuthedHandler<
  {
    body: Input
  },
  Input
>

const handler: ApiType = async (req, res) => {
  res.send(req.body)
}

export default handler

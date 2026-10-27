import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'

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

/**
 * Boolean fields, one of them with a documented default
 */
const handler: ApiType = async (req, res) => {
  res.send(req.body)
}

export default authedApi(handler)

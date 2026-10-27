import type { EmptyObj, OpenHandler } from 'core/handler'
import { openApi } from 'core/access'

type ApiType = OpenHandler<EmptyObj, { isOk: boolean }>

/**
 *  Check server is ok
 */
const handler: ApiType = async (_req, res) => {
  res.send({ isOk: true })
}

export default openApi(handler)

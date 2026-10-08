import type { EmptyObj, OpenHandler } from '../../../../types/handler.js'
import { openApi } from '../../../access/index.js'

type ApiType = OpenHandler<EmptyObj, { isOk: boolean }>

/**
 *  Check server is ok
 */
const handler: ApiType = async (_request, replay) => {
  replay.send({ isOk: true })
}

export default openApi(handler)

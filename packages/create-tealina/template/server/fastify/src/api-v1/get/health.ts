import type { EmptyObj, OpenHandler } from '../../../types/handler.js'
import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

type ApiType = OpenHandler<EmptyObj, { isOk: boolean }>

/**
 *  Check server is ok
 */
const handler: ApiType = async (_request, replay) => {
  replay.send({ isOk: true })
}

export default convention(openHandler, handler)

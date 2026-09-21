import type { EmptyObj, OpenHandler } from '../../../types/handler.js'
import { convention } from '../../convention.js'

type ApiType = OpenHandler<EmptyObj, { isOk: boolean }>

/**
 *  Check server is ok
 */
const handler: ApiType = async ctx => {
  ctx.body = { isOk: true }
}

export default convention(handler)

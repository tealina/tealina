import type { AuthedHandler, EmptyObj } from '../../../types/handler.js'
import { convention } from '../../convention.js'

type ApiType = AuthedHandler<EmptyObj, { status: string }>

/**
 *  Get server status. Login required.
 */
const handler: ApiType = async (_req, res) => {
  res.send({ status: 'Fine' })
}

export default convention(handler)

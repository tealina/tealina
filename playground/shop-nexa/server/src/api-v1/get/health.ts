import type { OpenHandler } from '../../../types/handler.js'
import { convention } from '../../convention.js'

type ApiType = OpenHandler<null, { status: string }>

const handler: ApiType = async (req, res) => {
  res.send({ status: 'Fine' })
}

export default convention(handler)

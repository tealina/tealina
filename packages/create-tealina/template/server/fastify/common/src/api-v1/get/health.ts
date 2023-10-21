import type { OpenHandler } from '../../../types/handler'
import { convention } from '../../convention'

type ApiType = OpenHandler<{}, { status: string }>

const handler: ApiType = async (req, res) => {
  res.send({ status: 'Fine' })
}

export default convention(handler)

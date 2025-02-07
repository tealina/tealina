import type { EmptyObj, OpenHandler } from '../../../types/handler.js'
import { convention } from '../../convention.js'

type ApiType = OpenHandler<EmptyObj, { status: string }>

const handler: ApiType = async ctx => {
  ctx.body = { status: 'Fine' }
}

export default convention(handler)

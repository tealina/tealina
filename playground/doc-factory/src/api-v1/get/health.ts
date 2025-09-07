import type { EmptyObj, OpenHandler } from '../../../types/handler.js'

type ApiType = OpenHandler<EmptyObj, { status: string }>

const handler: ApiType = async (req, res) => {
  res.send({ status: 'Fine' })
}

export default handler

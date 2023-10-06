import type { OpenHandler } from '../../../types/handler.js'

type ApiType = OpenHandler<{}, { status: string }>

const handler: ApiType = async (req, res) => {
  res.send({ status: 'Fine' })
}

export default handler

import type { OpenHandler } from '../../../types/handler'

type ApiType = OpenHandler<{}, { status: string }>

const handler: ApiType = async (req, res) => {
  res.send({ status: 'Fine' })
}

export default handler

import type { WithStatusCode } from '@tealina/utility-types'
import type { EmptyObj, OpenHandler } from '../../../types/handler.js'

type ApiType = OpenHandler<EmptyObj, WithStatusCode<200, { status: string }>>

const handler: ApiType = async (req, res) => {
  res.send({ status: 'Fine' })
}

export default handler

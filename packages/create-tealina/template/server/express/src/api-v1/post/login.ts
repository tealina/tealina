import type { OpenHandler } from '../../../types/handler.js'
import { convention } from '../../convention.js'

interface LoginPayload {
  // Should not contains special symbol
  account: string
  password: string
}

type ApiType = OpenHandler<{ body: LoginPayload }, { token: string }>

const handler: ApiType = async (req, res) => {
  const { body } = req
  console.log(body.account)
  res.send({ token: 'JWT token' })
}

export default convention(handler)

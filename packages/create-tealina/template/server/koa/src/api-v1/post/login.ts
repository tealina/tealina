import type { OpenHandler } from '../../../types/handler.js'
import { convention } from '../../convention.js'

interface LoginPayload {
  // Should not contains special symbol
  account: string
  password: string
}

type ApiType = OpenHandler<{ body: LoginPayload }, { token: string }>

const handler: ApiType = async ctx => {
  const { body } = ctx.request
  console.log(body.account)
  ctx.body = { token: 'JWT token' }
}

export default convention(handler)

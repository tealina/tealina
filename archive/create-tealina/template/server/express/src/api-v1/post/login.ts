import type { OpenHandler } from '../../../types/handler.js'
import { convention } from '../../convention.js'

/**
 * Use the 'interface' keyword to declare types
 * to ensure the type name is preserved in the API documentation.
 */
interface LoginPayload {
  // Single-line comments with slashes will be ignored
  account: string
  /** This JSDoc comment will appear in the documentation */
  password: string
}

type ApiType = OpenHandler<{ body: LoginPayload }, { token: string }>

const handler: ApiType = async (req, res) => {
  const { body } = req
  console.log(body.account)
  res.send({ token: 'JWT token' })
}

export default convention(handler)

import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

/**
 *  Check server is ok
 * @type {OpenAPI<EmptyObj, { isOk: boolean }>}
 */
const handler = async (_req, res) => {
  res.send({ isOk: true })
}

export default convention(openHandler, handler)

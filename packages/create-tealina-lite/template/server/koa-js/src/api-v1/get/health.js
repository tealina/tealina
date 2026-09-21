import { openHandler } from '../../app/middlewares/auth/openHandler.js'
import { convention } from '../../convention.js'

/**
 *  Check server is ok
 * @type {OpenAPI<EmptyObj, { isOk: boolean }>}
 */
const handler = async ctx => {
  ctx.body = { isOk: true }
}

export default convention(openHandler, handler)

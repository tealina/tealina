import { openApi } from '../../../access/index.js'

/**
 *  Check server is ok
 * @type {OpenAPI<EmptyObj, { isOk: boolean }>}
 */
const handler = async ctx => {
  ctx.body = { isOk: true }
}

export default openApi(handler)

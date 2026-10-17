import { openApi } from 'core/access'

/**
 *  Check server is ok
 * @type {OpenAPI<EmptyObj, { isOk: boolean }>}
 */
const handler = async ctx => {
  ctx.body = { isOk: true }
}

export default openApi(handler)

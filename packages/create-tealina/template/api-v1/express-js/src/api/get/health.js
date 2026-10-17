import { openApi } from 'core/access'

/**
 *  Check server is ok
 * @type {OpenAPI<EmptyObj, { isOk: boolean }>}
 */
const handler = async (_req, res) => {
  res.send({ isOk: true })
}

export default openApi(handler)

import { openApi } from '../../../access/index.js'

/**
 *  Check server is ok
 * @type {OpenAPI<EmptyObj, { isOk: boolean }>}
 */
const handler = async (_req, res) => {
  res.send({ isOk: true })
}

export default openApi(handler)

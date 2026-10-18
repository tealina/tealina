import { FuncAPI } from '../../apiUtility.js'

/**
 * upload handler
 */
const handler: FuncAPI<{ payload: File }, { url: string }> = async function (
  _req,
  _res,
) {}

export default handler

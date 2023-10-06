import { FuncAPI } from '../../../apiUtility.js'

/**
 * upload handler
 */
const handler: FuncAPI<{ payload: File }, { url: string }> = async function (
  req,
  res,
) {}

export default handler

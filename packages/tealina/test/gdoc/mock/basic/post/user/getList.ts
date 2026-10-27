import { FindManyArgs, FuncAPI, PageResult } from '../../../apiUtility.js'
import { User } from '../../../models.js'

/**
 * get datas page by page
 */
const handler: FuncAPI<FindManyArgs, PageResult<User>> = () => {}

/**
 * interrupt parser
 */
const _mock = () => {}
export default handler

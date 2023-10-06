import { FindManyArgs, FuncAPI, PageResult } from '../../../apiUtility.js'
import { Article } from '../../../models.js'

/**
 * get datas page by page
 */
const handler: FuncAPI<FindManyArgs, PageResult<Article>> = () => {}

export default handler

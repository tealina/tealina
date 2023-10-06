import { FuncAPI, ModelId } from '../../../apiUtility.js'
import { User } from '../../../models.js'
import { Pure } from '../../../pure.js'

/**
 * create an user
 */
const handler: FuncAPI<Pure.UserUpdateInput & ModelId, User> = () => {}

export default handler

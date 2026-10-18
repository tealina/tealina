import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { OrderView } from '../../../model.js'
import { parseId } from '../../../http.js'
import { getOrder } from '../../../store/index.js'

type ApiType = AuthedHandler<{ params: { id: string } }, OrderView>

/**
 * One order with its lines. Customers may only read their own; admins may read any.
 */
const handler: ApiType = async (req, res) => {
  res.send(
    getOrder(parseId(req.params.id), {
      userId: Number(res.locals.userId),
      isAdmin: res.locals.role === 'ADMIN',
    }),
  )
}

export default authedApi(handler)

import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import { getOrder, type OrderView } from 'core/services'

type ApiType = AuthedHandler<{ params: { id: string } }, OrderView>

/**
 * One order with its lines. Customers may only read their own; admins may read any.
 */
const handler: ApiType = async (req, res) => {
  res.send(getOrder(res.locals, req.params.id))
}

export default authedApi(handler)

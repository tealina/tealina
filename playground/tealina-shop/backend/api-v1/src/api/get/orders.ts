import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { Pure } from 'core/pure'
import { listOrders, type OrderView } from 'core/services'

export interface OrdersQuery {
  /** Omit for every status. */
  status?: Pure.OrderStatus
}

type ApiType = AuthedHandler<{ query: OrdersQuery }, OrderView[]>

/**
 * Orders, newest first. A customer sees their own; an admin sees the whole shop.
 */
const handler: ApiType = async (req, res) => {
  res.send(listOrders(res.locals, req.query.status))
}

export default authedApi(handler)

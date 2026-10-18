import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { Pure } from '../../../types/pure.js'
import type { OrderView } from '../../model.js'
import { listOrders } from '../../store/index.js'

export interface OrdersQuery {
  /** Omit for every status. */
  status?: Pure.OrderStatus
}

type ApiType = AuthedHandler<{ query: OrdersQuery }, OrderView[]>

/**
 * Orders, newest first. A customer sees their own; an admin sees the whole shop.
 */
const handler: ApiType = async (req, res) => {
  const isAdmin = res.locals.role === 'ADMIN'
  res.send(
    listOrders(
      { userId: Number(res.locals.userId), isAdmin },
      req.query.status,
    ),
  )
}

export default authedApi(handler)

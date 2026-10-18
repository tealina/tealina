import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { Pure } from '../../../../../types/pure.js'
import type { OrderView } from '../../../../model.js'
import { parseId, requireAdmin } from '../../../../http.js'
import { updateOrderStatus } from '../../../../store/index.js'

export interface OrderStatusPayload {
  /** The next state. Allowed moves: PENDING→PAID, PAID→SHIPPED, SHIPPED→DELIVERED, or cancel while pending/paid. */
  status: Pure.OrderStatus
}

type ApiType = AuthedHandler<
  { params: { id: string }; body: OrderStatusPayload },
  OrderView
>

/**
 * Advance an order through the fulfilment states. Admin only.
 *
 * Cancelling returns the ordered units to stock; a delivered or cancelled order is
 * final and answers 409.
 */
const handler: ApiType = async (req, res) => {
  requireAdmin(res.locals.role)
  res.send(updateOrderStatus(parseId(req.params.id), req.body.status))
}

export default authedApi(handler)

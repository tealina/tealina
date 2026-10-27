import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { Pure } from 'core/pure'
import { updateOrderStatus, type OrderView } from 'core/services'

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
  res.send(updateOrderStatus(res.locals, req.params.id, req.body.status))
}

export default authedApi(handler)

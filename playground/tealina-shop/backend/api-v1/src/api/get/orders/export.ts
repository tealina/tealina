import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { MultiTarget, WithHeaders } from 'tealina/utility-types'
import type { Pure } from '../../../../types/pure.js'
import { requireAdmin } from '../../../http.js'
import { listOrders } from '../../../store/index.js'

export interface OrderExportQuery {
  /** Export only one state; omit for every order. */
  status?: Pure.OrderStatus
}

type ApiType = AuthedHandler<
  { query: OrderExportQuery },
  MultiTarget<{
    server: void
    client: Blob
    doc: WithHeaders<
      {
        'Content-Type': 'text/csv; charset=utf-8'
        'Content-Disposition': string
      },
      string
    >
  }>
>

const csvCell = (value: string | number) => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Download every order as CSV. Admin only.
 *
 * The response is a file, not JSON: `Content-Disposition` names it for the browser and
 * the document page shows it in the playground.
 */
const handler: ApiType = async (req, res) => {
  requireAdmin(res.locals.role)
  const orders = listOrders({ userId: 0, isAdmin: true }, req.query.status)
  const rows = orders.map(order =>
    [
      order.orderNo,
      order.createdAt,
      order.customerName,
      order.status,
      order.items.reduce((sum, item) => sum + item.quantity, 0),
      order.total.toFixed(2),
    ]
      .map(csvCell)
      .join(','),
  )
  const csv = [
    'orderNo,createdAt,customer,status,units,total',
    ...rows,
    '',
  ].join('\n')

  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="tealina-orders-${new Date()
      .toISOString()
      .slice(0, 10)}.csv"`,
  })
  res.end(csv)
}

export default authedApi(handler)

import type { AuthedLocals } from '../../types/common.js'
import type { Pure } from '../../types/pure.js'
import { HttpError, parseId } from './errors.js'
import type { CheckoutItem, OrderView } from './model.js'
import {
  customerName,
  now,
  orderView,
  orders,
  products,
  pushActivity,
  round2,
  takeOrderId,
  takeOrderItemId,
  takeOrderNumber,
  type OrderRecord,
} from './store.js'
import { requireAdmin, viewerOf, type Viewer } from './viewer.js'

/** The orders a viewer may see, newest first. */
const visibleOrders = (
  viewer: Viewer,
  status?: Pure.OrderStatus,
): OrderRecord[] =>
  orders
    .filter(order => viewer.isAdmin || order.userId === viewer.userId)
    .filter(order => status == null || order.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

export const listOrders = (
  locals: AuthedLocals,
  status?: Pure.OrderStatus,
): OrderView[] => visibleOrders(viewerOf(locals), status).map(orderView)

export const getOrder = (locals: AuthedLocals, rawId: string): OrderView => {
  const viewer = viewerOf(locals)
  const id = parseId(rawId)
  const order = orders.find(candidate => candidate.id === id)
  if (order == null) {
    throw new HttpError(404, 'NOT_FOUND', `Order ${id} does not exist.`)
  }
  if (!viewer.isAdmin && order.userId !== viewer.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'That order belongs to someone else.')
  }
  return orderView(order)
}

export const createOrder = (
  locals: AuthedLocals,
  items: CheckoutItem[],
  note?: string,
): OrderView => {
  if (items.length === 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'The cart is empty.')
  }

  // Two lines for the same product become one, so the stock check is per product.
  const quantities = new Map<number, number>()
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Quantity must be at least 1.',
      )
    }
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    )
  }

  const orderId = takeOrderId()
  const lines: Pure.OrderItem[] = []
  let total = 0
  for (const [productId, quantity] of quantities) {
    const product = products.find(candidate => candidate.id === productId)
    if (product == null) {
      throw new HttpError(
        404,
        'NOT_FOUND',
        `Product ${productId} does not exist.`,
      )
    }
    if (product.stock < quantity) {
      throw new HttpError(
        409,
        'CONFLICT',
        `Only ${product.stock} × ${product.name} left in stock.`,
      )
    }
    product.stock -= quantity
    product.updatedAt = now()
    total += product.price * quantity
    lines.push({
      id: takeOrderItemId(),
      orderId,
      productId,
      quantity,
      unitPrice: product.price,
    })
  }

  const userId = viewerOf(locals).userId
  const order: OrderRecord = {
    id: orderId,
    orderNo: takeOrderNumber(),
    status: 'PENDING',
    total: round2(total),
    note: note == null || note.trim() === '' ? null : note.trim(),
    createdAt: now(),
    userId,
    items: lines,
  }
  orders.push(order)
  pushActivity(
    'order',
    `${customerName(userId)} placed order ${order.orderNo} for $${order.total.toFixed(2)}`,
  )
  return orderView(order)
}

/** What an admin may do next. A delivered or cancelled order is final. */
export const kOrderTransitions: Record<Pure.OrderStatus, Pure.OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export const updateOrderStatus = (
  locals: AuthedLocals,
  rawId: string,
  status: Pure.OrderStatus,
): OrderView => {
  requireAdmin(viewerOf(locals))
  const id = parseId(rawId)
  const order = orders.find(candidate => candidate.id === id)
  if (order == null) {
    throw new HttpError(404, 'NOT_FOUND', `Order ${id} does not exist.`)
  }
  if (order.status === status) {
    throw new HttpError(409, 'CONFLICT', `Order is already ${status}.`)
  }
  if (!kOrderTransitions[order.status].includes(status)) {
    throw new HttpError(
      409,
      'CONFLICT',
      `An order that is ${order.status} cannot become ${status}.`,
    )
  }
  if (status === 'CANCELLED') {
    for (const item of order.items) {
      const product = products.find(
        candidate => candidate.id === item.productId,
      )
      if (product != null) {
        product.stock += item.quantity
        product.updatedAt = now()
      }
    }
  }
  order.status = status
  pushActivity('order', `Order ${order.orderNo} is now ${status}`)
  return orderView(order)
}

const csvCell = (value: string | number) => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const exportOrdersCsv = (
  locals: AuthedLocals,
  status?: Pure.OrderStatus,
): { filename: string; csv: string } => {
  const viewer = viewerOf(locals)
  requireAdmin(viewer)
  const rows = visibleOrders(viewer, status).map(order =>
    [
      order.orderNo,
      order.createdAt,
      customerName(order.userId),
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
  const filename = `tealina-orders-${new Date().toISOString().slice(0, 10)}.csv`
  return { filename, csv }
}

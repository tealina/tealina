import type { AuthedLocals } from '../../types/common.js'
import type { Pure } from '../../types/pure.js'
import type { StatsOverview } from './model.js'
import {
  orderView,
  orders,
  productView,
  products,
  round2,
  users,
} from './store.js'
import { requireAdmin, viewerOf } from './viewer.js'

export const getStats = (locals: AuthedLocals): StatsOverview => {
  requireAdmin(viewerOf(locals))
  const live = orders.filter(order => order.status !== 'CANCELLED')
  const ordersByStatus = {
    PENDING: 0,
    PAID: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  } satisfies Record<Pure.OrderStatus, number>
  for (const order of orders) ordersByStatus[order.status] += 1

  return {
    revenue: round2(live.reduce((sum, order) => sum + order.total, 0)),
    orderCount: orders.length,
    customerCount: users.filter(user => user.role === 'CUSTOMER').length,
    productCount: products.length,
    lowStock: products
      .filter(product => product.stock <= 10)
      .map(productView)
      .sort((a, b) => a.stock - b.stock),
    ordersByStatus,
    recentOrders: [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map(orderView),
  }
}

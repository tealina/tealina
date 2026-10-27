import type { Pure } from '../../types/pure.js'
import type {
  ActivityEvent,
  OrderLine,
  OrderView,
  ProductView,
  PublicUser,
} from './model.js'
import {
  seedActivity,
  seedCategories,
  seedComments,
  seedOrders,
  seedProducts,
  seedUsers,
  type OrderRecord,
} from './seed.js'

/**
 * The demo's database: arrays in module scope, seeded on first import and lost when the
 * process exits. Every read builds the joined view the page asks for, so there is exactly
 * one copy of the truth.
 *
 * Only the domain modules in this directory touch these arrays; nothing outside
 * `core/services` imports this file.
 */
export const users: Pure.User[] = [...seedUsers]
export const categories: Pure.Category[] = [...seedCategories]
export const products: Pure.Product[] = [...seedProducts]
export const orders: OrderRecord[] = seedOrders.map(order => ({
  ...order,
  items: order.items.map(item => ({ ...item })),
}))
export const comments: Pure.Comment[] = [...seedComments]
export const activity: ActivityEvent[] = [...seedActivity]

let nextUserId = 4
let nextProductId = 12
let nextOrderId = 5
let nextOrderItemId = 7
let nextCommentId = 7
let nextActivityId = 5
let nextOrderNumber = 45

export const takeUserId = () => nextUserId++
export const takeProductId = () => nextProductId++
export const takeOrderId = () => nextOrderId++
export const takeOrderItemId = () => nextOrderItemId++
export const takeCommentId = () => nextCommentId++
export const takeOrderNumber = () =>
  `TS-${new Date().getFullYear()}-${String(nextOrderNumber++).padStart(4, '0')}`

export const now = () => new Date().toISOString()

export const round2 = (value: number) => Math.round(value * 100) / 100

export const publicUser = (user: Pure.User): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
})

const categoryName = (categoryId: number) =>
  categories.find(category => category.id === categoryId)?.name ??
  'Uncategorized'

const ratingOf = (productId: number) => {
  const ratings = comments
    .filter(comment => comment.productId === productId)
    .map(comment => comment.rating)
  if (ratings.length === 0) return { rating: 0, reviewCount: 0 }
  const mean = ratings.reduce((sum, value) => sum + value, 0) / ratings.length
  return { rating: Math.round(mean * 10) / 10, reviewCount: ratings.length }
}

export const productView = (product: Pure.Product): ProductView => ({
  ...product,
  categoryName: categoryName(product.categoryId),
  ...ratingOf(product.id),
})

export const customerName = (userId: number) =>
  users.find(user => user.id === userId)?.name ?? 'Unknown customer'

export const orderView = (order: OrderRecord): OrderView => ({
  id: order.id,
  orderNo: order.orderNo,
  status: order.status,
  total: order.total,
  note: order.note,
  createdAt: order.createdAt,
  userId: order.userId,
  customerName: customerName(order.userId),
  items: order.items.map(item => {
    const product = products.find(candidate => candidate.id === item.productId)
    const line: OrderLine = {
      productId: item.productId,
      name: product?.name ?? 'Removed product',
      emoji: product?.emoji ?? '·',
      accent: product?.accent ?? '#8c8378',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: round2(item.quantity * item.unitPrice),
    }
    return line
  }),
})

export const pushActivity = (
  type: ActivityEvent['type'],
  message: string,
): ActivityEvent => {
  const event: ActivityEvent = {
    id: nextActivityId++,
    type,
    message,
    at: now(),
  }
  activity.push(event)
  if (activity.length > 40) activity.splice(0, activity.length - 40)
  return event
}

export type { OrderRecord }

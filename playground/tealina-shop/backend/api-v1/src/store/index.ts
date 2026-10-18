import type {
  ActivityEvent,
  CommentView,
  OrderLine,
  OrderView,
  ProductList,
  ProductView,
  PublicUser,
  StatsOverview,
} from '../model.js'
import type { Pure } from '../../types/pure.js'
import { HttpError } from '../http.js'
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
 * The demo's database: arrays in module scope, seeded on first import and lost when
 * the process exits. Every read builds the joined view the page asks for, so there is
 * exactly one copy of the truth.
 */
const users: Pure.User[] = [...seedUsers]
const categories: Pure.Category[] = [...seedCategories]
const products: Pure.Product[] = [...seedProducts]
const orders: OrderRecord[] = seedOrders.map(order => ({
  ...order,
  items: order.items.map(item => ({ ...item })),
}))
const comments: Pure.Comment[] = [...seedComments]
const activity: ActivityEvent[] = [...seedActivity]

let nextUserId = 4
let nextProductId = 12
let nextOrderId = 5
let nextOrderItemId = 7
let nextCommentId = 7
let nextActivityId = 5
let nextOrderNumber = 45

const now = () => new Date().toISOString()

const round2 = (value: number) => Math.round(value * 100) / 100

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

const productView = (product: Pure.Product): ProductView => ({
  ...product,
  categoryName: categoryName(product.categoryId),
  ...ratingOf(product.id),
})

const customerName = (userId: number) =>
  users.find(user => user.id === userId)?.name ?? 'Unknown customer'

const orderView = (order: OrderRecord): OrderView => ({
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

const pushActivity = (
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

// ---------------------------------------------------------------------------
// Users and sessions
// ---------------------------------------------------------------------------

export const findUserByEmail = (email: string) =>
  users.find(user => user.email.toLowerCase() === email.trim().toLowerCase())

export const findUserById = (id: number) => users.find(user => user.id === id)

export const authenticate = (email: string, password: string) => {
  const user = findUserByEmail(email)
  if (user == null || user.password !== password) return null
  return user
}

export const registerUser = (input: {
  name: string
  email: string
  password: string
}) => {
  const name = input.name.trim()
  const email = input.email.trim()
  if (name.length < 2) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Name needs at least 2 characters.',
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'That email address is not valid.',
    )
  }
  if (input.password.length < 6) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Password needs at least 6 characters.',
    )
  }
  if (findUserByEmail(email) != null) {
    throw new HttpError(
      409,
      'CONFLICT',
      'An account with that email already exists.',
    )
  }
  const user: Pure.User = {
    id: nextUserId++,
    name,
    email,
    password: input.password,
    role: 'CUSTOMER',
    createdAt: now(),
  }
  users.push(user)
  pushActivity('comment', `${user.name} joined the store`)
  return user
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const listCategories = () =>
  categories.map(category => ({ ...category }))

export type ProductQuery = {
  keyword?: string
  categoryId?: number
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating'
  page?: number
  pageSize?: number
}

export const listProducts = (query: ProductQuery): ProductList => {
  const keyword = query.keyword?.trim().toLowerCase()
  const page = Math.max(1, Math.trunc(query.page ?? 1))
  const pageSize = Math.min(48, Math.max(1, Math.trunc(query.pageSize ?? 8)))

  let items = products.map(productView)
  if (query.categoryId != null) {
    items = items.filter(product => product.categoryId === query.categoryId)
  }
  if (keyword != null && keyword !== '') {
    items = items.filter(
      product =>
        product.name.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword) ||
        product.categoryName.toLowerCase().includes(keyword),
    )
  }

  switch (query.sort) {
    case 'price-asc':
      items.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      items.sort((a, b) => b.price - a.price)
      break
    case 'rating':
      items.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
      break
    default:
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  const total = items.length
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export const getProduct = (id: number) => {
  const product = products.find(candidate => candidate.id === id)
  if (product == null) {
    throw new HttpError(404, 'NOT_FOUND', `Product ${id} does not exist.`)
  }
  return productView(product)
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const createProduct = (input: Pure.ProductCreateInput) => {
  const name = input.name.trim()
  if (name === '') {
    throw new HttpError(400, 'VALIDATION_ERROR', 'A product needs a name.')
  }
  if (input.price < 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Price cannot be negative.')
  }
  if (!Number.isInteger(input.stock) || input.stock < 0) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Stock must be a whole number.',
    )
  }
  if (!categories.some(category => category.id === input.categoryId)) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'That category does not exist.',
    )
  }
  const slug = input.slug.trim() === '' ? slugify(name) : slugify(input.slug)
  if (products.some(product => product.slug === slug)) {
    throw new HttpError(409, 'CONFLICT', `The slug "${slug}" is already taken.`)
  }

  const product: Pure.Product = {
    id: nextProductId++,
    name,
    slug,
    description: input.description.trim(),
    price: round2(input.price),
    stock: input.stock,
    emoji: input.emoji.trim() === '' ? '☕' : input.emoji.trim(),
    accent: input.accent,
    categoryId: input.categoryId,
    createdAt: now(),
    updatedAt: now(),
  }
  products.unshift(product)
  pushActivity(
    'stock',
    `${product.name} was added to the catalog (${product.stock} in stock)`,
  )
  return productView(product)
}

export const updateProduct = (id: number, input: Pure.ProductUpdateInput) => {
  const product = products.find(candidate => candidate.id === id)
  if (product == null) {
    throw new HttpError(404, 'NOT_FOUND', `Product ${id} does not exist.`)
  }
  if (input.price != null && input.price < 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Price cannot be negative.')
  }
  if (
    input.stock != null &&
    (!Number.isInteger(input.stock) || input.stock < 0)
  ) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Stock must be a whole number.',
    )
  }
  if (
    input.categoryId != null &&
    !categories.some(category => category.id === input.categoryId)
  ) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'That category does not exist.',
    )
  }
  if (input.slug != null && input.slug.trim() !== '') {
    const slug = slugify(input.slug)
    if (
      products.some(candidate => candidate.id !== id && candidate.slug === slug)
    ) {
      throw new HttpError(
        409,
        'CONFLICT',
        `The slug "${slug}" is already taken.`,
      )
    }
    product.slug = slug
  }

  const stockBefore = product.stock
  if (input.name != null && input.name.trim() !== '')
    product.name = input.name.trim()
  if (input.description != null) product.description = input.description.trim()
  if (input.price != null) product.price = round2(input.price)
  if (input.stock != null) product.stock = input.stock
  if (input.emoji != null && input.emoji.trim() !== '') {
    product.emoji = input.emoji.trim()
  }
  if (input.accent != null) product.accent = input.accent
  if (input.categoryId != null) product.categoryId = input.categoryId
  product.updatedAt = now()

  if (product.stock !== stockBefore) {
    pushActivity(
      'stock',
      `${product.name} stock changed from ${stockBefore} to ${product.stock}`,
    )
  }
  return productView(product)
}

export const deleteProduct = (id: number) => {
  const index = products.findIndex(candidate => candidate.id === id)
  if (index < 0) {
    throw new HttpError(404, 'NOT_FOUND', `Product ${id} does not exist.`)
  }
  const referenced = orders.some(order =>
    order.items.some(item => item.productId === id),
  )
  if (referenced) {
    throw new HttpError(
      409,
      'CONFLICT',
      'This product appears in an order, so its history keeps it in the catalog.',
    )
  }
  const [removed] = products.splice(index, 1)
  pushActivity('stock', `${removed.name} was removed from the catalog`)
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export const listComments = (productId: number): CommentView[] => {
  getProduct(productId)
  return comments
    .filter(comment => comment.productId === productId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(comment => ({
      ...comment,
      authorName: customerName(comment.userId),
    }))
}

export const addComment = (
  productId: number,
  userId: number,
  input: { rating: number; text: string },
): CommentView => {
  getProduct(productId)
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Rating must be 1 to 5.')
  }
  const text = input.text.trim()
  if (text.length < 3) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Write a few more words.')
  }
  const comment: Pure.Comment = {
    id: nextCommentId++,
    productId,
    userId,
    rating: input.rating,
    text,
    createdAt: now(),
  }
  comments.push(comment)
  pushActivity('comment', `${customerName(userId)} reviewed a product`)
  return { ...comment, authorName: customerName(userId) }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type CheckoutItem = { productId: number; quantity: number }

const newOrderNumber = () =>
  `TS-${new Date().getFullYear()}-${String(nextOrderNumber++).padStart(4, '0')}`

export const createOrder = (
  userId: number,
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

  const orderId = nextOrderId++
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
      id: nextOrderItemId++,
      orderId,
      productId,
      quantity,
      unitPrice: product.price,
    })
  }

  const order: OrderRecord = {
    id: orderId,
    orderNo: newOrderNumber(),
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

export const listOrders = (
  requester: { userId: number; isAdmin: boolean },
  status?: Pure.OrderStatus,
): OrderView[] =>
  orders
    .filter(order => requester.isAdmin || order.userId === requester.userId)
    .filter(order => status == null || order.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(orderView)

export const getOrder = (
  id: number,
  requester: { userId: number; isAdmin: boolean },
): OrderView => {
  const order = orders.find(candidate => candidate.id === id)
  if (order == null) {
    throw new HttpError(404, 'NOT_FOUND', `Order ${id} does not exist.`)
  }
  if (!requester.isAdmin && order.userId !== requester.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'That order belongs to someone else.')
  }
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
  id: number,
  status: Pure.OrderStatus,
): OrderView => {
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

// ---------------------------------------------------------------------------
// Dashboard and activity
// ---------------------------------------------------------------------------

export const getStats = (): StatsOverview => {
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

/** Activity newer than `sinceId`, oldest first, so a stream can replay it in order. */
export const listActivity = (sinceId = 0): ActivityEvent[] =>
  activity.filter(event => event.id > sinceId).sort((a, b) => a.id - b.id)

export const latestActivityId = () =>
  activity.reduce((max, event) => Math.max(max, event.id), 0)

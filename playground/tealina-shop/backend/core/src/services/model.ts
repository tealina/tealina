import type { Pure } from '../../types/pure.js'

/**
 * The shapes the services answer with. `Pure.*` are the entities `gtype` read off
 * `prisma/schema.prisma`; the `*View` types add the joins a page needs, so the frontend
 * never has to make a second call to learn a category name or an author's name.
 */
export type PublicUser = Pick<
  Pure.User,
  'id' | 'name' | 'email' | 'role' | 'createdAt'
>

export type ProductView = Pure.Product & {
  categoryName: string
  /** Mean of the product's comment ratings, rounded to one decimal; 0 when unrated. */
  rating: number
  reviewCount: number
}

export type ProductList = {
  items: ProductView[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ProductQuery = {
  keyword?: string
  categoryId?: number
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating'
  page?: number
  pageSize?: number
}

export type CommentView = Pure.Comment & {
  authorName: string
}

export type OrderLine = {
  productId: number
  name: string
  emoji: string
  accent: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type OrderView = Pure.Order & {
  customerName: string
  items: OrderLine[]
}

export type StatsOverview = {
  revenue: number
  orderCount: number
  customerCount: number
  productCount: number
  lowStock: ProductView[]
  ordersByStatus: Record<Pure.OrderStatus, number>
  recentOrders: OrderView[]
}

export type ActivityEvent = {
  id: number
  type: 'order' | 'stock' | 'comment'
  message: string
  at: string
}

export type LoginResult = {
  token: string
  user: PublicUser
}

export interface Health {
  /** Always "ok" while the process is answering. */
  status: 'ok'
  service: string
  /** ISO timestamp of the response. */
  time: string
}

/** One line of a checkout: a product and how many of it. */
export type CheckoutItem = { productId: number; quantity: number }

/** Every error response body the services throw. */
export type ApiErrorBody = {
  code:
    | 'VALIDATION_ERROR'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'FORBIDDEN'
    | 'UNAUTHORIZED'
  message: string
}

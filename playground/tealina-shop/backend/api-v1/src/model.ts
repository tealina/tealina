import type { Pure } from '../types/pure.js'

/**
 * The shapes the handlers answer with. They live outside `src/api` because `align`
 * treats every directory under the api directory as an HTTP method.
 *
 * `Pure.*` are the entities `gtype` read off `prisma/schema.prisma`; the `*View` types
 * add the joins a page needs, so the frontend never has to make a second call to learn
 * a category name or an author's name.
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

/** Every error response body the handlers send. */
export type ApiErrorBody = {
  code:
    | 'VALIDATION_ERROR'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'FORBIDDEN'
    | 'UNAUTHORIZED'
  message: string
}

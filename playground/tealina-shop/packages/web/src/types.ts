import type { TakeBody, TakeQuery, TakeResponse } from './api/client'

/**
 * The web side names no member of the API twice. Each type below is read off the
 * handler that produces it, so changing a field in `backend/api-v1` breaks this file
 * — which is the point, not a bug.
 */
export type Category = TakeResponse<'get', 'categories'>[number]
export type ProductList = TakeResponse<'get', 'products'>
export type ProductView = TakeResponse<'get', 'products/:id'>
export type CommentView = TakeResponse<'get', 'products/:id/comments'>[number]
export type PublicUser = TakeResponse<'get', 'me'>
export type OrderView = TakeResponse<'get', 'orders'>[number]
export type OrderStatus = OrderView['status']
export type StatsOverview = TakeResponse<'get', 'stats/overview'>
export type LoginResult = TakeResponse<'post', 'auth/login'>

export type ProductsQuery = TakeQuery<'get', 'products'>
export type OrdersQuery = TakeQuery<'get', 'orders'>
export type Sort = NonNullable<ProductsQuery['sort']>
export type CheckoutPayload = TakeBody<'post', 'orders'>
export type CreateProductBody = TakeBody<'post', 'products'>
export type UpdateProductBody = TakeBody<'patch', 'products/:id'>

/** A cart line keeps its own copy of the product, so it survives a reload. */
export type CartItem = {
  productId: number
  name: string
  price: number
  emoji: string
  accent: string
  quantity: number
}

export type Session = {
  token: string
  user: PublicUser
}

/**
 * One frame of `GET /feed/activity`. The endpoint declares its client projection as
 * an `AsyncGenerator`, so the event itself is not reachable through `TakeResponse`;
 * this mirrors the server's `ActivityEvent` and the SSE `data` field.
 */
export type ActivityEvent = {
  id: number
  type: 'order' | 'stock' | 'comment'
  message: string
  at: string
}

export type FeedState = 'idle' | 'live' | 'done'

export type View = 'shop' | 'orders' | 'admin'

export type ToastKind = 'ok' | 'error'

export type Toast = {
  id: number
  message: string
  kind: ToastKind
}

export type AppState = {
  view: View
  query: {
    keyword: string
    categoryId: number | undefined
    sort: Sort
    page: number
  }
  categories: Category[]
  catalog: ProductList | null
  catalogLoading: boolean
  session: Session | null
  cart: CartItem[]
  selected: { product: ProductView; comments: CommentView[] } | null
  orders: OrderView[] | null
  ordersFilter: OrderStatus | ''
  stats: StatsOverview | null
  adminProducts: ProductView[] | null
  activity: ActivityEvent[]
  feedState: FeedState
  ui: {
    cartOpen: boolean
    authOpen: boolean
    authMode: 'login' | 'register'
    busy: boolean
  }
}

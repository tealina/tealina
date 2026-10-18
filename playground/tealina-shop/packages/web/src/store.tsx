import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { ApiError, base, req, restoreToken, setToken } from './api/client'
import { loadCart, saveCart } from './state'
import type {
  ActivityEvent,
  AppState,
  CartItem,
  CheckoutPayload,
  CreateProductBody,
  FeedState,
  LoginResult,
  OrderStatus,
  OrdersQuery,
  ProductView,
  ProductsQuery,
  Sort,
  Toast,
  ToastKind,
  View,
} from './types'

const kPageSize = 8

const route = (): View => {
  const hash = location.hash.replace(/^#\/?/, '')
  return hash === 'orders' || hash === 'admin' ? hash : 'shop'
}

export const describeError = (error: unknown) =>
  error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Something went wrong.'

const productsQuery = (query: AppState['query']): ProductsQuery => {
  const next: ProductsQuery = {
    sort: query.sort,
    page: query.page,
    pageSize: kPageSize,
  }
  const keyword = query.keyword.trim()
  if (keyword !== '') next.keyword = keyword
  if (query.categoryId !== undefined) next.categoryId = query.categoryId
  return next
}

const findProduct = (state: AppState, id: number): ProductView | undefined =>
  state.catalog?.items.find(product => product.id === id) ??
  state.adminProducts?.find(product => product.id === id) ??
  (state.selected?.product.id === id ? state.selected.product : undefined)

export type AuthMode = 'login' | 'register'

type AuthPayload = {
  name: string
  email: string
  password: string
}

export type ShopActions = {
  go: (view: View) => void
  toast: (message: string, kind?: ToastKind) => void
  openProduct: (id: number) => Promise<void>
  closeProduct: () => void
  addToCart: (id: number) => Promise<void>
  openCart: () => void
  closeCart: () => void
  changeQuantity: (id: number, delta: number) => void
  removeFromCart: (id: number) => void
  checkout: (note: string) => Promise<boolean>
  openAuth: (mode?: AuthMode) => void
  closeAuth: () => void
  setAuthMode: (mode: AuthMode) => void
  authenticate: (mode: AuthMode, payload: AuthPayload) => Promise<void>
  logout: () => void
  search: (keyword: string) => void
  setSort: (sort: Sort) => void
  setCategory: (id: number | undefined) => void
  clearFilters: () => void
  setPage: (page: number) => void
  setOrdersFilter: (status: OrderStatus | '') => void
  refreshOrders: () => Promise<void>
  advanceOrder: (id: number, status: OrderStatus) => Promise<void>
  exportOrders: () => Promise<void>
  refreshAdmin: () => Promise<void>
  saveStock: (id: number, stock: number) => Promise<void>
  restock: (id: number) => Promise<void>
  deleteProduct: (id: number) => Promise<void>
  postReview: (id: number, rating: number, text: string) => Promise<void>
  createProduct: (body: CreateProductBody) => Promise<void>
  startFeed: () => void
  stopFeed: (next?: FeedState) => void
}

type ShopContextValue = {
  state: AppState
  toasts: Toast[]
  actions: ShopActions
}

const ShopContext = createContext<ShopContextValue | null>(null)

export const useShop = () => {
  const value = useContext(ShopContext)
  if (value == null)
    throw new Error('useShop must be used inside <ShopProvider>')
  return value
}

const createInitialState = (): AppState => ({
  view: route(),
  query: { keyword: '', categoryId: undefined, sort: 'newest', page: 1 },
  categories: [],
  catalog: null,
  catalogLoading: false,
  session: null,
  cart: loadCart(),
  selected: null,
  orders: null,
  ordersFilter: '',
  stats: null,
  adminProducts: null,
  activity: [],
  feedState: 'idle',
  ui: { cartOpen: false, authOpen: false, authMode: 'login', busy: false },
})

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(createInitialState)
  const [toasts, setToasts] = useState<Toast[]>([])
  const stateRef = useRef(state)
  stateRef.current = state

  const toastId = useRef(0)
  const feedRef = useRef<EventSource | null>(null)
  const catalogSeq = useRef(0)
  const ordersSeq = useRef(0)
  const adminSeq = useRef(0)

  const toast = useCallback((message: string, kind: ToastKind = 'ok') => {
    const id = ++toastId.current
    setToasts(list => [...list, { id, message, kind }])
    window.setTimeout(() => {
      setToasts(list => list.filter(item => item.id !== id))
    }, 4000)
  }, [])

  /* ---------------------------------------------------------------- routing */

  const go = useCallback((view: View) => {
    if (location.hash !== `#/${view}`) {
      history.replaceState(null, '', `#/${view}`)
    }
    setState(current =>
      current.view === view ? current : { ...current, view },
    )
  }, [])

  useEffect(() => {
    const onHash = () => {
      const view = route()
      setState(current =>
        current.view === view ? current : { ...current, view },
      )
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  /* ------------------------------------------------------------ data loads */

  const loadCategories = useCallback(async () => {
    try {
      const categories = await req.get('categories')
      setState(current => ({ ...current, categories }))
    } catch (error) {
      toast(describeError(error), 'error')
    }
  }, [toast])

  const loadCatalog = useCallback(async () => {
    const seq = ++catalogSeq.current
    setState(current => ({ ...current, catalogLoading: true }))
    try {
      const catalog = await req.get('products', {
        query: productsQuery(stateRef.current.query),
      })
      if (seq === catalogSeq.current) {
        setState(current => ({ ...current, catalog }))
      }
    } catch (error) {
      if (seq === catalogSeq.current) toast(describeError(error), 'error')
    } finally {
      if (seq === catalogSeq.current) {
        setState(current => ({ ...current, catalogLoading: false }))
      }
    }
  }, [toast])

  const loadOrders = useCallback(async () => {
    if (stateRef.current.session == null) {
      setState(current => ({ ...current, orders: null }))
      return
    }
    const seq = ++ordersSeq.current
    setState(current => ({ ...current, orders: null }))
    try {
      const query: OrdersQuery = {}
      if (stateRef.current.ordersFilter !== '') {
        query.status = stateRef.current.ordersFilter
      }
      const orders = await req.get('orders', { query })
      if (seq === ordersSeq.current) {
        setState(current => ({ ...current, orders }))
      }
    } catch (error) {
      if (seq === ordersSeq.current) toast(describeError(error), 'error')
    }
  }, [toast])

  const loadAdmin = useCallback(async () => {
    if (stateRef.current.session?.user.role !== 'ADMIN') {
      setState(current => ({
        ...current,
        stats: null,
        adminProducts: null,
      }))
      return
    }
    const seq = ++adminSeq.current
    try {
      const [stats, products] = await Promise.all([
        req.get('stats/overview'),
        req.get('products', {
          query: { page: 1, pageSize: 48, sort: 'newest' },
        }),
      ])
      if (seq === adminSeq.current) {
        setState(current => ({
          ...current,
          stats,
          adminProducts: products.items,
        }))
      }
    } catch (error) {
      if (seq === adminSeq.current) toast(describeError(error), 'error')
    }
  }, [toast])

  const restoreSession = useCallback(async () => {
    const token = restoreToken()
    if (token === '') return
    try {
      const user = await req.get('me')
      setState(current => ({ ...current, session: { token, user } }))
    } catch {
      // An expired or tampered token is the same as no token.
      setToken('')
      setState(current => ({ ...current, session: null }))
    }
  }, [])

  useEffect(() => {
    void loadCategories()
    void restoreSession()
  }, [loadCategories, restoreSession])

  useEffect(() => {
    if (state.view === 'shop') void loadCatalog()
  }, [state.view, state.query, loadCatalog])

  useEffect(() => {
    if (state.view === 'orders' && state.session != null) void loadOrders()
  }, [state.view, state.ordersFilter, state.session?.token, loadOrders])

  useEffect(() => {
    if (state.view !== 'admin' || state.session == null) return
    if (state.session.user.role !== 'ADMIN') {
      toast('The back office needs an admin account.', 'error')
      go('shop')
      return
    }
    void loadAdmin()
  }, [
    state.view,
    state.session?.token,
    state.session?.user.role,
    loadAdmin,
    go,
    toast,
  ])

  /* ----------------------------------------------------------- live feed */

  const stopFeed = useCallback((next: FeedState = 'idle') => {
    feedRef.current?.close()
    feedRef.current = null
    setState(current =>
      current.feedState === next ? current : { ...current, feedState: next },
    )
  }, [])

  const startFeed = useCallback(() => {
    if (feedRef.current != null) return
    setState(current => ({ ...current, activity: [], feedState: 'live' }))

    const source = new EventSource(`${base}/feed/activity`)
    feedRef.current = source

    const receive = (event: Event) => {
      const message = event as MessageEvent<string>
      try {
        const parsed: unknown = JSON.parse(message.data)
        if (
          typeof parsed !== 'object' ||
          parsed == null ||
          typeof (parsed as ActivityEvent).id !== 'number'
        ) {
          return
        }
        const next = parsed as ActivityEvent
        setState(current => ({
          ...current,
          activity: [next, ...current.activity].slice(0, 20),
        }))
      } catch {
        // A frame we cannot read is not worth tearing the page down for.
      }
    }

    source.addEventListener('order', receive)
    source.addEventListener('stock', receive)
    source.addEventListener('comment', receive)
    source.addEventListener('close', () => {
      // The handler ends the stream after eight events; closing here keeps
      // EventSource from reconnecting and replaying them.
      stopFeed('done')
    })
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) stopFeed('done')
    }
  }, [stopFeed])

  useEffect(() => {
    if (state.view !== 'admin' && state.feedState !== 'idle') stopFeed()
  }, [state.view, state.feedState, stopFeed])

  useEffect(() => () => feedRef.current?.close(), [])

  /* -------------------------------------------------------------- session */

  const completeLogin = useCallback(
    (result: LoginResult) => {
      setToken(result.token)
      setState(current => ({
        ...current,
        session: { token: result.token, user: result.user },
        ui: { ...current.ui, authOpen: false, authMode: 'login' },
      }))
      toast(`Welcome back, ${result.user.name.split(' ')[0]}.`)
    },
    [toast],
  )

  const authenticate = useCallback(
    async (mode: AuthMode, payload: AuthPayload) => {
      const result =
        mode === 'register'
          ? await req.post('auth/register', {
              body: {
                name: payload.name.trim(),
                email: payload.email.trim(),
                password: payload.password,
              },
            })
          : await req.post('auth/login', {
              body: {
                email: payload.email.trim(),
                password: payload.password,
              },
            })
      completeLogin(result)
    },
    [completeLogin],
  )

  const logout = useCallback(() => {
    const leavingAdmin = stateRef.current.view === 'admin'
    setToken('')
    stopFeed()
    if (leavingAdmin) history.replaceState(null, '', '#/shop')
    setState(current => ({
      ...current,
      session: null,
      orders: null,
      stats: null,
      adminProducts: null,
      view: leavingAdmin ? 'shop' : current.view,
    }))
    toast('Signed out.')
  }, [stopFeed, toast])

  /* ------------------------------------------------------------------ auth UI */

  const openAuth = useCallback((mode: AuthMode = 'login') => {
    setState(current => ({
      ...current,
      ui: { ...current.ui, authOpen: true, authMode: mode },
    }))
  }, [])

  const closeAuth = useCallback(() => {
    setState(current => ({
      ...current,
      ui: { ...current.ui, authOpen: false },
    }))
  }, [])

  const setAuthMode = useCallback((mode: AuthMode) => {
    setState(current => ({
      ...current,
      ui: { ...current.ui, authMode: mode },
    }))
  }, [])

  const openCart = useCallback(() => {
    setState(current => ({ ...current, ui: { ...current.ui, cartOpen: true } }))
  }, [])

  const closeCart = useCallback(() => {
    setState(current => ({
      ...current,
      ui: { ...current.ui, cartOpen: false },
    }))
  }, [])

  /* --------------------------------------------------------------- catalog */

  const search = useCallback((keyword: string) => {
    setState(current => ({
      ...current,
      query: { ...current.query, keyword, page: 1 },
    }))
  }, [])

  const setSort = useCallback((sort: Sort) => {
    setState(current => ({
      ...current,
      query: { ...current.query, sort, page: 1 },
    }))
  }, [])

  const setCategory = useCallback((categoryId: number | undefined) => {
    setState(current => ({
      ...current,
      query: { ...current.query, categoryId, page: 1 },
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setState(current => ({
      ...current,
      query: { keyword: '', categoryId: undefined, sort: 'newest', page: 1 },
    }))
  }, [])

  const setPage = useCallback((page: number) => {
    setState(current => ({
      ...current,
      query: { ...current.query, page: Math.max(1, page) },
    }))
  }, [])

  const openProduct = useCallback(
    async (id: number) => {
      try {
        const [product, comments] = await Promise.all([
          req.get('products/:id', { params: { id: String(id) } }),
          req.get('products/:id/comments', { params: { id: String(id) } }),
        ])
        setState(current => ({ ...current, selected: { product, comments } }))
      } catch (error) {
        toast(describeError(error), 'error')
      }
    },
    [toast],
  )

  const closeProduct = useCallback(() => {
    setState(current => ({ ...current, selected: null }))
  }, [])

  /* ------------------------------------------------------------------- cart */

  const addToCart = useCallback(
    async (id: number) => {
      let product = findProduct(stateRef.current, id)
      if (product == null) {
        try {
          product = await req.get('products/:id', {
            params: { id: String(id) },
          })
        } catch (error) {
          toast(describeError(error), 'error')
          return
        }
      }
      const cart = stateRef.current.cart
      const line = cart.find(item => item.productId === id)
      if (line != null ? line.quantity >= product.stock : product.stock === 0) {
        toast(
          line != null
            ? `Only ${product.stock} in stock.`
            : 'That one is sold out.',
          'error',
        )
        return
      }
      const next: CartItem[] =
        line == null
          ? [
              ...cart,
              {
                productId: product.id,
                name: product.name,
                price: product.price,
                emoji: product.emoji,
                accent: product.accent,
                quantity: 1,
              },
            ]
          : cart.map(item =>
              item.productId === id
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            )
      saveCart(next)
      setState(current => ({ ...current, cart: next }))
      toast(`${product.name} added to cart.`)
    },
    [toast],
  )

  const changeQuantity = useCallback((id: number, delta: number) => {
    const cart = stateRef.current.cart
    const line = cart.find(item => item.productId === id)
    if (line == null) return
    const quantity = line.quantity + delta
    const next: CartItem[] =
      quantity <= 0
        ? cart.filter(item => item.productId !== id)
        : cart.map(item =>
            item.productId === id ? { ...item, quantity } : item,
          )
    saveCart(next)
    setState(current => ({ ...current, cart: next }))
  }, [])

  const removeFromCart = useCallback((id: number) => {
    const next = stateRef.current.cart.filter(item => item.productId !== id)
    saveCart(next)
    setState(current => ({ ...current, cart: next }))
  }, [])

  const checkout = useCallback(
    async (note: string) => {
      const current = stateRef.current
      if (current.session == null) {
        openAuth('login')
        return false
      }
      if (current.cart.length === 0) return false

      const items = current.cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
      const trimmed = note.trim()
      const body: CheckoutPayload =
        trimmed === '' ? { items } : { items, note: trimmed }

      setState(value => ({ ...value, ui: { ...value.ui, busy: true } }))
      try {
        const order = await req.post('orders', { body })
        const alreadyOrders = current.view === 'orders'
        saveCart([])
        setState(value => ({
          ...value,
          cart: [],
          ui: { ...value.ui, busy: false, cartOpen: false },
        }))
        toast(`Order ${order.orderNo} placed.`)
        go('orders')
        if (alreadyOrders) void loadOrders()
        return true
      } catch (error) {
        setState(value => ({
          ...value,
          ui: { ...value.ui, busy: false },
        }))
        toast(describeError(error), 'error')
        return false
      }
    },
    [go, loadOrders, openAuth, toast],
  )

  /* ----------------------------------------------------------------- orders */

  const setOrdersFilter = useCallback((status: OrderStatus | '') => {
    setState(current => ({ ...current, ordersFilter: status }))
  }, [])

  const refreshOrders = useCallback(async () => {
    await loadOrders()
  }, [loadOrders])

  const advanceOrder = useCallback(
    async (id: number, status: OrderStatus) => {
      try {
        await req.patch('orders/:id/status', {
          params: { id: String(id) },
          body: { status },
        })
        toast(`Order moved to ${status.toLowerCase()}.`)
        await loadOrders()
        if (stateRef.current.session?.user.role === 'ADMIN') {
          await loadAdmin()
        }
      } catch (error) {
        toast(describeError(error), 'error')
      }
    },
    [loadAdmin, loadOrders, toast],
  )

  const exportOrders = useCallback(async () => {
    try {
      const blob = await req.get('orders/export', { query: {} })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'tealina-orders.csv'
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast('CSV downloaded.')
    } catch (error) {
      toast(describeError(error), 'error')
    }
  }, [toast])

  /* ------------------------------------------------------------------ admin */

  const refreshAdmin = useCallback(async () => {
    setState(current => ({
      ...current,
      stats: null,
      adminProducts: null,
    }))
    await loadAdmin()
  }, [loadAdmin])

  const saveStock = useCallback(
    async (id: number, stock: number) => {
      if (!Number.isInteger(stock) || stock < 0) {
        toast('Stock has to be a whole number of zero or more.', 'error')
        return
      }
      try {
        await req.patch('products/:id', {
          params: { id: String(id) },
          body: { stock },
        })
        toast('Stock saved.')
        await loadAdmin()
      } catch (error) {
        toast(describeError(error), 'error')
      }
    },
    [loadAdmin, toast],
  )

  const restock = useCallback(
    async (id: number) => {
      const product =
        stateRef.current.adminProducts?.find(
          candidate => candidate.id === id,
        ) ?? null
      if (product == null) return
      try {
        await req.patch('products/:id', {
          params: { id: String(id) },
          body: { stock: product.stock + 10 },
        })
        toast(`${product.name} restocked to ${product.stock + 10}.`)
        await loadAdmin()
      } catch (error) {
        toast(describeError(error), 'error')
      }
    },
    [loadAdmin, toast],
  )

  const deleteProduct = useCallback(
    async (id: number) => {
      const product =
        stateRef.current.adminProducts?.find(
          candidate => candidate.id === id,
        ) ?? null
      if (product == null) return
      if (!window.confirm(`Delete “${product.name}”?`)) return
      try {
        await req.delete('products/:id', { params: { id: String(id) } })
        toast(`${product.name} removed.`)
        await Promise.all([loadCatalog(), loadAdmin()])
      } catch (error) {
        // The store refuses products that appear on an order; the message explains why.
        toast(describeError(error), 'error')
      }
    },
    [loadAdmin, loadCatalog, toast],
  )

  /* ------------------------------------------------------------------ forms */

  const postReview = useCallback(
    async (id: number, rating: number, text: string) => {
      await req.post('products/:id/comments', {
        params: { id: String(id) },
        body: { rating, text: text.trim() },
      })
      await openProduct(id)
      toast('Review posted.')
    },
    [openProduct, toast],
  )

  const createProduct = useCallback(
    async (body: CreateProductBody) => {
      const product = await req.post('products', { body })
      toast(`${product.name} added to the catalog.`)
      await Promise.all([loadCatalog(), loadAdmin()])
    },
    [loadAdmin, loadCatalog, toast],
  )

  /* --------------------------------------------------------------- keyboard */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const current = stateRef.current
      if (current.ui.authOpen) closeAuth()
      else if (current.selected != null) closeProduct()
      else if (current.ui.cartOpen) closeCart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeAuth, closeProduct, closeCart])

  const actions: ShopActions = {
    go,
    toast,
    openProduct,
    closeProduct,
    addToCart,
    openCart,
    closeCart,
    changeQuantity,
    removeFromCart,
    checkout,
    openAuth,
    closeAuth,
    setAuthMode,
    authenticate,
    logout,
    search,
    setSort,
    setCategory,
    clearFilters,
    setPage,
    setOrdersFilter,
    refreshOrders,
    advanceOrder,
    exportOrders,
    refreshAdmin,
    saveStock,
    restock,
    deleteProduct,
    postReview,
    createProduct,
    startFeed,
    stopFeed,
  }

  return (
    <ShopContext.Provider value={{ state, toasts, actions }}>
      {children}
    </ShopContext.Provider>
  )
}

import type { CartItem } from './types'

const kCartKey = 'tealina-shop.cart'

export const loadCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(kCartKey)
    if (raw == null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is CartItem =>
        typeof item === 'object' &&
        item != null &&
        typeof item.productId === 'number' &&
        typeof item.name === 'string' &&
        typeof item.price === 'number' &&
        typeof item.quantity === 'number' &&
        typeof item.emoji === 'string' &&
        typeof item.accent === 'string',
    )
  } catch {
    return []
  }
}

export const saveCart = (cart: CartItem[]) => {
  try {
    localStorage.setItem(kCartKey, JSON.stringify(cart))
  } catch {
    // Storage may be unavailable; the in-memory cart still works this session.
  }
}

export const cartCount = (cart: CartItem[]) =>
  cart.reduce((sum, item) => sum + item.quantity, 0)

export const cartTotal = (cart: CartItem[]) =>
  cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

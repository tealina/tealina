import type { AuthedLocals } from '../../types/common.js'
import type { Pure } from '../../types/pure.js'
import { HttpError, parseId } from './errors.js'
import type {
  CommentView,
  ProductList,
  ProductQuery,
  ProductView,
} from './model.js'
import {
  categories,
  comments,
  customerName,
  now,
  orders,
  productView,
  products,
  pushActivity,
  round2,
  takeCommentId,
  takeProductId,
} from './store.js'
import { requireAdmin, viewerOf } from './viewer.js'

export const listCategories = (): Pure.Category[] =>
  categories.map(category => ({ ...category }))

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

const findProduct = (id: number) => {
  const product = products.find(candidate => candidate.id === id)
  if (product == null) {
    throw new HttpError(404, 'NOT_FOUND', `Product ${id} does not exist.`)
  }
  return product
}

export const getProduct = (rawId: string): ProductView =>
  productView(findProduct(parseId(rawId)))

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const createProduct = (
  locals: AuthedLocals,
  input: Pure.ProductCreateInput,
): ProductView => {
  requireAdmin(viewerOf(locals))
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
    id: takeProductId(),
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

export const updateProduct = (
  locals: AuthedLocals,
  rawId: string,
  input: Pure.ProductUpdateInput,
): ProductView => {
  requireAdmin(viewerOf(locals))
  const id = parseId(rawId)
  const product = findProduct(id)
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

export const deleteProduct = (locals: AuthedLocals, rawId: string) => {
  requireAdmin(viewerOf(locals))
  const id = parseId(rawId)
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

export const listComments = (rawId: string): CommentView[] => {
  const productId = parseId(rawId)
  findProduct(productId)
  return comments
    .filter(comment => comment.productId === productId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(comment => ({
      ...comment,
      authorName: customerName(comment.userId),
    }))
}

export const addComment = (
  locals: AuthedLocals,
  rawId: string,
  input: { rating: number; text: string },
): CommentView => {
  const productId = parseId(rawId)
  findProduct(productId)
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Rating must be 1 to 5.')
  }
  const text = input.text.trim()
  if (text.length < 3) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Write a few more words.')
  }
  const userId = viewerOf(locals).userId
  const comment: Pure.Comment = {
    id: takeCommentId(),
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

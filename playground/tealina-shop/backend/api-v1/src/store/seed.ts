import type { ActivityEvent } from '../model.js'
import type { Pure } from '../../types/pure.js'

/** A stored order is an order row plus the lines it was placed with. */
export type OrderRecord = Pure.Order & { items: Pure.OrderItem[] }

export const seedUsers: Pure.User[] = [
  {
    id: 1,
    name: 'Neo Yeo',
    email: 'admin@tealina.dev',
    password: 'admin123',
    role: 'ADMIN',
    createdAt: '2025-11-02T09:00:00.000Z',
  },
  {
    id: 2,
    name: 'Mia Chen',
    email: 'mia@example.com',
    password: 'demo123',
    role: 'CUSTOMER',
    createdAt: '2026-01-18T14:20:00.000Z',
  },
  {
    id: 3,
    name: 'Leo Park',
    email: 'leo@example.com',
    password: 'demo123',
    role: 'CUSTOMER',
    createdAt: '2026-03-04T07:45:00.000Z',
  },
]

export const seedCategories: Pure.Category[] = [
  {
    id: 1,
    name: 'Coffee Beans',
    slug: 'beans',
    description: 'Single-origin lots, roasted every Monday.',
  },
  {
    id: 2,
    name: 'Brewers',
    slug: 'brewers',
    description: 'Drippers, kettles and grinders for the counter.',
  },
  {
    id: 3,
    name: 'Accessories',
    slug: 'accessories',
    description: 'The small things that make the ritual easier.',
  },
  {
    id: 4,
    name: 'Subscriptions',
    slug: 'subscriptions',
    description: 'A fresh bag on your doorstep, on a schedule you choose.',
  },
]

export const seedProducts: Pure.Product[] = [
  {
    id: 1,
    name: 'Ethiopia Guji Natural',
    slug: 'ethiopia-guji-natural',
    description:
      'Blueberry, jasmine and cane sugar. A natural-process lot from the Guji highlands, roasted light.',
    price: 18.5,
    stock: 42,
    emoji: '🌺',
    accent: '#b4552d',
    categoryId: 1,
    createdAt: '2026-09-08T08:00:00.000Z',
    updatedAt: '2026-10-12T08:00:00.000Z',
  },
  {
    id: 2,
    name: 'Colombia Huila Washed',
    slug: 'colombia-huila-washed',
    description:
      'Red apple and caramel, with a clean finish. The everyday pour-over we keep coming back to.',
    price: 16,
    stock: 58,
    emoji: '🏔️',
    accent: '#7a6a4f',
    categoryId: 1,
    createdAt: '2026-08-19T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 3,
    name: 'Kenya Nyeri AA',
    slug: 'kenya-nyeri-aa',
    description:
      'Blackcurrant and grapefruit. Bright, structured and loud in the best way.',
    price: 21,
    stock: 12,
    emoji: '🍒',
    accent: '#9c3d2e',
    categoryId: 1,
    createdAt: '2026-09-28T08:00:00.000Z',
    updatedAt: '2026-10-14T08:00:00.000Z',
  },
  {
    id: 4,
    name: 'Sumatra Mandheling',
    slug: 'sumatra-mandheling',
    description:
      'Earthy, low-acid and syrupy — the one for a rainy afternoon. Restocking soon.',
    price: 17.5,
    stock: 0,
    emoji: '🌿',
    accent: '#4f5d3a',
    categoryId: 1,
    createdAt: '2026-07-11T08:00:00.000Z',
    updatedAt: '2026-09-30T08:00:00.000Z',
  },
  {
    id: 5,
    name: 'Hand Grinder Pro',
    slug: 'hand-grinder-pro',
    description:
      '48 mm steel burrs with 36 clicks from espresso to French press. Fits in a carry-on.',
    price: 89,
    stock: 9,
    emoji: '⚙️',
    accent: '#5b6470',
    categoryId: 2,
    createdAt: '2026-06-02T08:00:00.000Z',
    updatedAt: '2026-10-09T08:00:00.000Z',
  },
  {
    id: 6,
    name: 'Pour-over Kettle',
    slug: 'pour-over-kettle',
    description:
      'A gooseneck spout and a counterbalanced handle for a steady, slow pour.',
    price: 64,
    stock: 15,
    emoji: '🫖',
    accent: '#8a5a3b',
    categoryId: 2,
    createdAt: '2026-05-17T08:00:00.000Z',
    updatedAt: '2026-09-26T08:00:00.000Z',
  },
  {
    id: 7,
    name: 'Ceramic Dripper V02',
    slug: 'ceramic-dripper-v02',
    description:
      'A 60° cone in matte stoneware. Takes the standard V02 papers and holds heat well.',
    price: 28,
    stock: 23,
    emoji: '⏳',
    accent: '#b07850',
    categoryId: 2,
    createdAt: '2026-04-23T08:00:00.000Z',
    updatedAt: '2026-10-03T08:00:00.000Z',
  },
  {
    id: 8,
    name: 'Travel Mug 350 ml',
    slug: 'travel-mug-350',
    description:
      'Double-walled steel that keeps a flat white hot for four hours and never sweats.',
    price: 32,
    stock: 31,
    emoji: '🥤',
    accent: '#3f6f6a',
    categoryId: 3,
    createdAt: '2026-03-12T08:00:00.000Z',
    updatedAt: '2026-09-18T08:00:00.000Z',
  },
  {
    id: 9,
    name: 'Filter Papers · 100 pcs',
    slug: 'filter-papers-100',
    description:
      'Unbleached V02 papers, 100 per box. The quiet workhorse of the whole setup.',
    price: 9,
    stock: 120,
    emoji: '📄',
    accent: '#a89a82',
    categoryId: 3,
    createdAt: '2026-02-08T08:00:00.000Z',
    updatedAt: '2026-08-30T08:00:00.000Z',
  },
  {
    id: 10,
    name: 'Cold Brew Bottle',
    slug: 'cold-brew-bottle',
    description:
      'A 750 ml borosilicate bottle with a removable steel filter. Steep overnight, drink all week.',
    price: 26,
    stock: 18,
    emoji: '🧊',
    accent: '#46657f',
    categoryId: 3,
    createdAt: '2026-06-25T08:00:00.000Z',
    updatedAt: '2026-10-06T08:00:00.000Z',
  },
  {
    id: 11,
    name: 'Monthly Roast Subscription',
    slug: 'monthly-roast-subscription',
    description:
      'One 250 g bag of the roaster’s pick, shipped on the first Monday of each month.',
    price: 24,
    stock: 999,
    emoji: '📦',
    accent: '#6b4f8f',
    categoryId: 4,
    createdAt: '2026-01-05T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
]

export const seedOrders: OrderRecord[] = [
  {
    id: 1,
    orderNo: 'TS-2026-0031',
    status: 'DELIVERED',
    total: 46.5,
    note: 'Leave with the concierge, please.',
    createdAt: '2026-09-22T10:12:00.000Z',
    userId: 2,
    items: [
      { id: 1, orderId: 1, productId: 1, quantity: 1, unitPrice: 18.5 },
      { id: 2, orderId: 1, productId: 7, quantity: 1, unitPrice: 28 },
    ],
  },
  {
    id: 2,
    orderNo: 'TS-2026-0038',
    status: 'SHIPPED',
    total: 89,
    note: null,
    createdAt: '2026-10-02T16:40:00.000Z',
    userId: 2,
    items: [{ id: 3, orderId: 2, productId: 5, quantity: 1, unitPrice: 89 }],
  },
  {
    id: 3,
    orderNo: 'TS-2026-0041',
    status: 'PAID',
    total: 25,
    note: null,
    createdAt: '2026-10-06T09:05:00.000Z',
    userId: 3,
    items: [
      { id: 4, orderId: 3, productId: 2, quantity: 1, unitPrice: 16 },
      { id: 5, orderId: 3, productId: 9, quantity: 1, unitPrice: 9 },
    ],
  },
  {
    id: 4,
    orderNo: 'TS-2026-0044',
    status: 'PENDING',
    total: 64,
    note: 'Gift — no receipt in the box.',
    createdAt: '2026-10-16T11:30:00.000Z',
    userId: 3,
    items: [{ id: 6, orderId: 4, productId: 6, quantity: 1, unitPrice: 64 }],
  },
]

export const seedComments: Pure.Comment[] = [
  {
    id: 1,
    productId: 1,
    userId: 2,
    rating: 5,
    text: 'Blueberry is not a marketing word here. Best natural I have had this year.',
    createdAt: '2026-09-25T12:10:00.000Z',
  },
  {
    id: 2,
    productId: 1,
    userId: 3,
    rating: 4,
    text: 'Lovely and floral, though it wants a coarser grind than my usual.',
    createdAt: '2026-10-01T08:30:00.000Z',
  },
  {
    id: 3,
    productId: 2,
    userId: 2,
    rating: 5,
    text: 'The house coffee now. Forgiving with a slightly off grind.',
    createdAt: '2026-09-14T18:00:00.000Z',
  },
  {
    id: 4,
    productId: 7,
    userId: 3,
    rating: 4,
    text: 'Holds heat much better than the plastic one. Wish it came in white.',
    createdAt: '2026-09-03T09:45:00.000Z',
  },
  {
    id: 5,
    productId: 5,
    userId: 2,
    rating: 5,
    text: 'Two years of daily use and the burrs still feel new. Worth it.',
    createdAt: '2026-10-08T21:15:00.000Z',
  },
  {
    id: 6,
    productId: 10,
    userId: 3,
    rating: 4,
    text: 'Filter comes out clean in one pull. The lid is a little stiff.',
    createdAt: '2026-10-10T07:20:00.000Z',
  },
]

export const seedActivity: ActivityEvent[] = [
  {
    id: 4,
    type: 'order',
    message: 'Leo Park placed order TS-2026-0044',
    at: '2026-10-16T11:30:00.000Z',
  },
  {
    id: 3,
    type: 'stock',
    message: 'Kenya Nyeri AA is down to 12 bags',
    at: '2026-10-14T15:02:00.000Z',
  },
  {
    id: 2,
    type: 'comment',
    message: 'Mia Chen reviewed Hand Grinder Pro',
    at: '2026-10-08T21:15:00.000Z',
  },
  {
    id: 1,
    type: 'order',
    message: 'Leo Park placed order TS-2026-0041',
    at: '2026-10-06T09:05:00.000Z',
  },
]

/** Purified types from [schema](../prisma/schema.prisma) */
export namespace Pure {
  interface User {
    /**  Display name shown on comments and orders */
    name: string
    /**  Sign-in address; unique in the demo store */
    email: string
    /**  Demo only: the seed passwords are written in `src/services/seed.ts` */
    password: string
    /** @default {CUSTOMER} */
    role: Role
    /** @default {autoincrement()} */
    id: number
    /** @default {now()} */
    createdAt: string
  }
  interface UserCreateInput {
    /**  Display name shown on comments and orders */
    name: string
    /**  Sign-in address; unique in the demo store */
    email: string
    /**  Demo only: the seed passwords are written in `src/services/seed.ts` */
    password: string
    /** @default {CUSTOMER} */
    role?: Role
    /** @default {autoincrement()} */
    id?: number
    /** @default {now()} */
    createdAt?: string
  }
  interface UserUpdateInput {
    /**  Display name shown on comments and orders */
    name?: string
    /**  Sign-in address; unique in the demo store */
    email?: string
    /**  Demo only: the seed passwords are written in `src/services/seed.ts` */
    password?: string
    /** @default {CUSTOMER} */
    role?: Role
    /** @default {autoincrement()} */
    id?: number
    /** @default {now()} */
    createdAt?: string
  }
  interface Category {
    /**  Name shown in the storefront's filter row */
    name: string
    /**  URL-friendly identifier */
    slug: string
    description: string
    /** @default {autoincrement()} */
    id: number
  }
  interface CategoryCreateInput {
    /**  Name shown in the storefront's filter row */
    name: string
    /**  URL-friendly identifier */
    slug: string
    description: string
    /** @default {autoincrement()} */
    id?: number
  }
  interface CategoryUpdateInput {
    /**  Name shown in the storefront's filter row */
    name?: string
    /**  URL-friendly identifier */
    slug?: string
    description?: string
    /** @default {autoincrement()} */
    id?: number
  }
  interface Product {
    /**  Product name as shown on the card */
    name: string
    /**  URL-friendly identifier */
    slug: string
    description: string
    /**  Price in USD */
    price: number
    /**  Units available; zero renders as "Sold out" */
    stock: number
    /**  Placeholder art: a gradient tile built from this emoji and `accent` */
    emoji: string
    /**  Tile colour, e.g. `#b4552d` */
    accent: string
    /** @default {now()} */
    createdAt: string
    updatedAt: string
    /** @default {autoincrement()} */
    id: number
    categoryId: number
  }
  interface ProductCreateInput {
    /**  Product name as shown on the card */
    name: string
    /**  URL-friendly identifier */
    slug: string
    description: string
    /**  Price in USD */
    price: number
    /**  Units available; zero renders as "Sold out" */
    stock: number
    /**  Placeholder art: a gradient tile built from this emoji and `accent` */
    emoji: string
    /**  Tile colour, e.g. `#b4552d` */
    accent: string
    /** @default {now()} */
    createdAt?: string
    updatedAt?: string
    /** @default {autoincrement()} */
    id?: number
    categoryId: number
  }
  interface ProductUpdateInput {
    /**  Product name as shown on the card */
    name?: string
    /**  URL-friendly identifier */
    slug?: string
    description?: string
    /**  Price in USD */
    price?: number
    /**  Units available; zero renders as "Sold out" */
    stock?: number
    /**  Placeholder art: a gradient tile built from this emoji and `accent` */
    emoji?: string
    /**  Tile colour, e.g. `#b4552d` */
    accent?: string
    /** @default {now()} */
    createdAt?: string
    updatedAt?: string
    /** @default {autoincrement()} */
    id?: number
    categoryId?: number
  }
  interface Order {
    /**  Human-readable order number, e.g. `TS-2026-0042` */
    orderNo: string
    /** @default {PENDING} */
    status: OrderStatus
    /**  Total in USD, fixed at checkout time */
    total: number
    note: string | null
    /** @default {now()} */
    createdAt: string
    /** @default {autoincrement()} */
    id: number
    userId: number
  }
  interface OrderCreateInput {
    /**  Human-readable order number, e.g. `TS-2026-0042` */
    orderNo: string
    /** @default {PENDING} */
    status?: OrderStatus
    /**  Total in USD, fixed at checkout time */
    total: number
    note?: string
    /** @default {now()} */
    createdAt?: string
    /** @default {autoincrement()} */
    id?: number
    userId: number
  }
  interface OrderUpdateInput {
    /**  Human-readable order number, e.g. `TS-2026-0042` */
    orderNo?: string
    /** @default {PENDING} */
    status?: OrderStatus
    /**  Total in USD, fixed at checkout time */
    total?: number
    note?: string | null
    /** @default {now()} */
    createdAt?: string
    /** @default {autoincrement()} */
    id?: number
    userId?: number
  }
  interface OrderItem {
    quantity: number
    /**  Price at the time the order was placed */
    unitPrice: number
    /** @default {autoincrement()} */
    id: number
    orderId: number
    productId: number
  }
  interface OrderItemCreateInput {
    quantity: number
    /**  Price at the time the order was placed */
    unitPrice: number
    /** @default {autoincrement()} */
    id?: number
    orderId: number
    productId: number
  }
  interface OrderItemUpdateInput {
    quantity?: number
    /**  Price at the time the order was placed */
    unitPrice?: number
    /** @default {autoincrement()} */
    id?: number
    orderId?: number
    productId?: number
  }
  interface Comment {
    /**  1 to 5 stars */
    rating: number
    text: string
    /** @default {now()} */
    createdAt: string
    /** @default {autoincrement()} */
    id: number
    productId: number
    userId: number
  }
  interface CommentCreateInput {
    /**  1 to 5 stars */
    rating: number
    text: string
    /** @default {now()} */
    createdAt?: string
    /** @default {autoincrement()} */
    id?: number
    productId: number
    userId: number
  }
  interface CommentUpdateInput {
    /**  1 to 5 stars */
    rating?: number
    text?: string
    /** @default {now()} */
    createdAt?: string
    /** @default {autoincrement()} */
    id?: number
    productId?: number
    userId?: number
  }
  /**
   * Enums
   */
  // Based on
  // https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275

  export const Role: {
    CUSTOMER: 'CUSTOMER'
    ADMIN: 'ADMIN'
  }
  export type Role = (typeof Role)[keyof typeof Role]

  export const OrderStatus: {
    PENDING: 'PENDING'
    PAID: 'PAID'
    SHIPPED: 'SHIPPED'
    DELIVERED: 'DELIVERED'
    CANCELLED: 'CANCELLED'
  }
  export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]
}

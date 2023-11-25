/** Purified mutation types from [schema](../prisma/schema.prisma) */
export namespace Pure {
  interface Category {
    /** @default {autoincrement()} */
    id: number
    categoryName: string
    description: string
  }

  interface CategoryCreateInput {
    categoryName: string
    description: string
  }

  interface CategoryUpdateInput {
    /** @default {autoincrement()} */
    id?: number
    categoryName?: string
    description?: string
  }

  interface Product {
    /** @default {autoincrement()} */
    id: number
    productName: string
    description: string
    price: number
    stockQuantity: number
    categoryId: number
  }

  interface ProductCreateInput {
    productName: string
    description: string
    price: number
    stockQuantity: number
    categoryId: number
  }

  interface ProductUpdateInput {
    /** @default {autoincrement()} */
    id?: number
    productName?: string
    description?: string
    price?: number
    stockQuantity?: number
    categoryId?: number
  }

  interface User {
    /** @default {autoincrement()} */
    id: number
    username: string
    password: string
    email: string
    address: string
    phoneNumber: string
  }

  interface UserCreateInput {
    username: string
    password: string
    email: string
    address: string
    phoneNumber: string
  }

  interface UserUpdateInput {
    /** @default {autoincrement()} */
    id?: number
    username?: string
    password?: string
    email?: string
    address?: string
    phoneNumber?: string
  }

  interface Order {
    /** @default {autoincrement()} */
    id: number
    orderDate: Date
    orderStatus: string
    userId: number
  }

  interface OrderCreateInput {
    orderDate: Date
    orderStatus: string
    userId: number
  }

  interface OrderUpdateInput {
    /** @default {autoincrement()} */
    id?: number
    orderDate?: Date
    orderStatus?: string
    userId?: number
  }

  interface OrderDetail {
    /** @default {autoincrement()} */
    id: number
    quantity: number
    unitPrice: number
    orderId: number
    productId: number
  }

  interface OrderDetailCreateInput {
    quantity: number
    unitPrice: number
    orderId: number
    productId: number
  }

  interface OrderDetailUpdateInput {
    /** @default {autoincrement()} */
    id?: number
    quantity?: number
    unitPrice?: number
    orderId?: number
    productId?: number
  }

  interface Payment {
    /** @default {autoincrement()} */
    id: number
    amount: number
    paymentDate: Date
    paymentStatus: string
    orderId: number
  }

  interface PaymentCreateInput {
    amount: number
    paymentDate: Date
    paymentStatus: string
    orderId: number
  }

  interface PaymentUpdateInput {
    /** @default {autoincrement()} */
    id?: number
    amount?: number
    paymentDate?: Date
    paymentStatus?: string
    orderId?: number
  }

  interface Comment {
    /** @default {autoincrement()} */
    id: number
    text: string
    /** @default {now()} */
    createdAt: Date
    userId: number
    productId: number
  }

  interface CommentCreateInput {
    text: string
    /** @default {now()} */
    createdAt?: Date
    userId: number
    productId: number
  }

  interface CommentUpdateInput {
    /** @default {autoincrement()} */
    id?: number
    text?: string
    /** @default {now()} */
    createdAt?: Date
    userId?: number
    productId?: number
  }
}

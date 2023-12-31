/**
 * Purified prisma mutation types from [schema](../prisma/schema.prisma)\
 * Generated by command ```tealina gpure```\
 */
export namespace Pure {
  export interface UserCreateInput {
    email: string
    name?: string
    role: Role
  }

  export interface ArticleCreateInput {
    /** @default {now()} */
    createdAt?: Date | string
    updatedAt?: Date | string
    title: string
    content?: string
    /** @default {false} */
    published?: boolean
    /** @default {0} */
    viewCount?: number
  }

  export interface UserUpdateInput {
    email?: string
    name?: string
    role?: Role
  }

  export interface ArticleUpdateInput {
    /** @default {now()} */
    createdAt?: Date | string
    updatedAt?: Date | string
    title?: string
    content?: string
    /** @default {false} */
    published?: boolean
    /** @default {0} */
    viewCount?: number
  }
  export const Role: {
    Admin: 'Admin'
    User: 'User'
  }

  export type Role = (typeof Role)[keyof typeof Role]
}

import { Pure } from './pure.js'

enum State {
  Active,
  Disabled = 3,
}

enum Badge {
  Blue,
  Gold = 'Glod',
}

/**
 * Model User
 *
 */
export type User = {
  id: number
  email: string
  name: string | null
  role: Pure.Role
  state: State
  badge: Badge
}

/**
 * Model Article
 *
 */
export type Article = {
  id: number
  createdAt: Date
  updatedAt: Date
  title: string
  content: string | null
  published: boolean
  viewCount: number
  authorId: number | null
}

type AuthHeaders = {
  Authorization: string
}
type EmptyObj = Record<string, unknown>
interface User {
  /** @default {autoincrement()} */
  id: number
  email: string
  name: string | null
}
interface UserCreateInput {
  /** @default {autoincrement()} */
  id?: number
  email: string
  name?: string
}
interface UserUpdateInput {
  /** @default {autoincrement()} */
  id?: number
  email?: string
  name?: string | null
}
type FindManyArgs = {
  skip?: number
  take?: number
  where?: Record<string, unknown>
}
export type MockApi = {
  get: {
    health: {
      response: {
        status: string
      }
      headers: EmptyObj
    }
    user: {
      query: {
        name: string
      }
      response: User
      headers: EmptyObj
    }
  }
  post: {
    'user/create': {
      body: UserCreateInput
      response: User
      headers: AuthHeaders
    }
    'user/getList': {
      body: FindManyArgs
      response: User[]
      headers: AuthHeaders
    }
    'user/:id/update': {
      body: UserUpdateInput
      params: { id: string }
      response: User
      headers: AuthHeaders
    }
  }
}

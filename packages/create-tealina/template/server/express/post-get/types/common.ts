export type ModelId = {
  id: number
}

export type FindManyArgs = {
  skip?: number
  take?: number
  where?: Record<string, any>
}

export interface PageResult<T> {
  datas: T[]
  total: number
}

export type AuthedLocals = {
  userId: string
}

export type AuthHeaders = {
  Authorization: string
}

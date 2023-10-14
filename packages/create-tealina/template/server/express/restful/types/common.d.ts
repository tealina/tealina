export type RawId = {
  id: string
}

export type RawFindManyArgs = {
  skip?: string
  take?: string
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

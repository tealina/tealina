// delta vs create-tealina: `ModelId` / `FindManyArgs` / `PageResult` are dropped here.
// They describe Prisma query shapes, and this scaffold has no database — keeping them
// would read as "there is a data layer you have not found yet".

export type AuthedLocals = {
  userId: string
}

export type AuthHeaders = {
  Authorization: string
}

export type JsonHeaders = {
  'Content-Type': 'application/json'
}

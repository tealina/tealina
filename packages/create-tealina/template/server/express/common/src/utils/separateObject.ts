import { omitFn, pickFn } from 'fp-lite'

export const separateObject = <T, Keys extends ReadonlyArray<keyof T>>(
  x: T,
  ...keys: Keys
) => [omitFn(x, ...keys), pickFn(x, ...keys)] as const

export const toKeyValues = <T extends Record<string, any>>(obj: T) =>
  Object.entries<T>(obj)

declare const emptyObjectSymbol: unique symbol
export type EmptyObject = { [emptyObjectSymbol]?: never }
/** [doc](https://github.com/sindresorhus/type-fest/blob/main/source/empty-object.d.ts) */
export type IsEmptyObject<T> = T extends EmptyObject ? true : false

/** [doc](https://github.com/sindresorhus/type-fest/blob/main/source/simplify.d.ts) */
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

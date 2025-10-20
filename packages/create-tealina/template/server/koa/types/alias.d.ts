import type { PickTarget, ExtractResponse } from '@tealina/utility-types'
import type { ExtendableContext } from 'koa'

export interface HandlerAliasCore<
  TPayload = {},
  TResponse = unknown,
  TLocals extends {} = {},
  T = PickTarget<TPayload, 'server'>,
  R = ExtractResponse<PickTarget<TResponse, 'server'>>,
> {
  (
    ctx: ExtendableContext & {
      request: T
    } & { body: ExtractResponse<R> } & {
      state: TLocals
    },
    next: () => Promise<any>,
  ): void
}

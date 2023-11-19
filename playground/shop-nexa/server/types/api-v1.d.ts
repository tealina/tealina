import apis from '../src/api-v1/index.ts'
import type { ResolveApiType } from './handler.ts'
import { Simplify } from './utility.js'

type RawApis = typeof apis
export type ApiTypesRecord = {
  [Method in keyof RawApis]: Simplify<
    ResolveApiType<Awaited<RawApis[Method]>['default']>
  >
}

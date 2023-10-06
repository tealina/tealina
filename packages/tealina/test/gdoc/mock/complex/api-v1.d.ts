import apis from './index.ts'
import type { ResolveApiType } from '../apiUtility.ts'

type RawApis = typeof apis

export type ApiTypeV1 = {
  [Method in keyof RawApis]: ResolveApiType<Awaited<RawApis[Method]>['default']>
}

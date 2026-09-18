import apis from './index.js'
import type { ResolveApiType } from '../apiUtility.js'

type RawApis = typeof apis

export type ApiTypeV1 = {
  [Method in keyof RawApis]: ResolveApiType<Awaited<RawApis[Method]>['default']>
}

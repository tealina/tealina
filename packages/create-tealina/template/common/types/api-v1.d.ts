import apis from '../src/api-v1/index'
import type { ResolveApiType } from './handler'

type RawApis = typeof apis
export type ApiTypesRecord = {
  [Method in keyof RawApis]: ResolveApiType<Awaited<RawApis[Method]>['default']>
}

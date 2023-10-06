import apis from '../src/api-v1/index.js'
import type { ResolveApiType } from './handler.js'

type RawApis = typeof apis
export type ApiTypesRecord = {
  [Method in keyof RawApis]: ResolveApiType<Awaited<RawApis[Method]>['default']>
}

import apis from '../src/api-v1/index.js'
import type {
  ResolveApiTypeForClient,
  ResolveApiTypeForDoc,
} from './handler.js'

type RawApis = typeof apis
export type ApiTypesForDoc = {
  [Method in keyof RawApis]: ResolveApiTypeForDoc<
    Awaited<RawApis[Method]>['default']
  >
}

export type ApiTypesForClient = {
  [Method in keyof RawApis]: ResolveApiTypeForClient<
    Awaited<RawApis[Method]>['default']
  >
}

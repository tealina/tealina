import apis from '../src/api-v1/index.js'
import type {
  ResolveApiTypeForClient,
  ResolveApiTypeForDoc,
} from './handler.js'

type RawApis = typeof apis

/**
 * The first type export in this file is used for API documentation generation.
 * This file is also specified in package.json's `export.types` field,
 * making it discoverable and importable by other packages.
 */
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

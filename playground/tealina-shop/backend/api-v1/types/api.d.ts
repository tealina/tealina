import apis from '../src/api/index.js'
import type {
  ResolveApiTypeForClient,
  ResolveApiTypeForDoc,
} from 'core/handler'

type RawApis = typeof apis

/**
 * The first type export in this file is used for API documentation generation.
 * This file is also specified in package.json's `export.types` field,
 * making it discoverable and importable by other packages.
 *
 * The name is fixed: the package exports it as `./api`, and `apiDir` in
 * `tealina.config` only says where the route tree is read from. Moving the directory
 * therefore does not change what a frontend imports.
 *
 * `ResolveApiType*` come from `core/handler` rather than a sibling file: the handler
 * shapes are framework-specific, and this package is not.
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

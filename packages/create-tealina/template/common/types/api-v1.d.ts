import type apis from '../src/api-v1/index.js'
import type { ResolveApiType } from './handler.js'

type RawApis = typeof apis
/**
 * The first type export in this file is used for API documentation generation.
 * This file is also specified in package.json's `export.types` field,
 * making it discoverable and importable by other packages.
 */
export type ApiTypesRecord = {
  [Method in keyof RawApis]: ResolveApiType<Awaited<RawApis[Method]>['default']>
}

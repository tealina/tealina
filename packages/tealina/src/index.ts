// Type definition here can avoid all `.ts` files generate a `.d.ts`

import type { GdocConfig } from './commands/gdoc'

export type { OpenAPIV3_1, OpenAPIV3 } from 'openapi-types'
export type { CustomOutputFn } from './commands/gdoc'
export type { StatusWith } from '@tealina/doc-types'
// gpure tyes ---- begin

export type MutationKind = 'CreateInput' | 'UpdateInput' | ''

export type CommentType = Record<'private' | 'public', string[]>

export type BlockAST = {
  name: string
  comment: CommentType
  keyword: string
  props: PropAST[]
  attribute: Map<string, string>
}

export type PropAST = {
  name: string
  comment: CommentType
  modifier?: string
  attribute: Map<string, string>
  type: string
  kind: 'scalarType' | 'model' | 'enum' | 'compositeType'
}

export interface MatheLocate {
  kind: MutationKind
  keyword: string
  blockName: string
}

export interface MatchForOptionalChcek extends MatheLocate {
  predicate: (prop: PropAST) => boolean
}

export interface MatchForTypeTransform extends MatheLocate {
  transform: (prop: PropAST) => string
}

export interface MatchForExcludeProp extends MatheLocate {
  predicate: (prop: PropAST) => boolean
}

export interface Overwrite {
  isOptional?: MatchForOptionalChcek[]
  transofrmType?: MatchForTypeTransform[]
  excludeProps?: MatchForExcludeProp[]
}

export interface GtypeConfig {
  /**
   * Output path for generated type definitions
   * @default "./types/pure.d.ts"
   */
  output?: string

  /**
   * Namespace for generated types
   * @default "Pure"
   * Use empty string if no namespace is needed.
   */
  namespace?: string

  /**
   * Override specific property types
   * Example: Make OrderNo optional or exclude it from OrderUpdateInput
   * Note: Optional fields will always include `| null` in the type definition
   */
  overwrite?: Overwrite

  /**
   * Custom type remapping function
   * Example: Convert DateTime to number
   * Important notes:
   * 1. Only affects mutation types
   * 2. Optional fields will always include `| null` in the type definition
   */
  typeRemap?: (type: string) => string | null
}

// gpure tyes ---- end

export interface TemplateContext {
  /** Directory path */
  dir?: string
  /** Capitalized directory name */
  Dir?: string
  /** Original filename */
  filename: string
  /** Capitalized filename */
  Filename: string
  /** Relative path to API directory */
  relative2api: string
  /** HTTP method (lowercase) */
  method: string
}

type CodeGenerateFuntion = (ctx: TemplateContext) => string

export type GenTestSuiteFnType = (ctx: {
  method: string
  route: string
  relative2ancestor: string
}) => string

export type GenTestHelperFnType = (ctx: {
  relative2ancestor: string
  apiDirName: string
  typesDirName: string
}) => string

export interface ApiTemplateType {
  /**
   * Template short identifier
   * - Single character, case sensitive
   * - `*` indicates fallback template when no alias or name matches
   */
  alias: string

  /**
   * Template name
   * - Used as the generated filename
   */
  name: string

  /**
   * HTTP request method
   * @default 'post'
   */
  method?: string

  /** Code generation function */
  generateFn: CodeGenerateFuntion
}

export type TemplateConfig = {
  /** Collection of API handler templates */
  handlers: ApiTemplateType[]
  /**  Generate integration test file */
  test?: {
    genSuite: GenTestSuiteFnType
    genHelper?: GenTestHelperFnType
  }
}

export interface TealinaConifg {
  template?: TemplateConfig
  typesDir: string
  /**
   * Where generated integration test file store
   */
  testDir?: string
  gtype?: GtypeConfig
  gdoc?: GdocConfig
  /** Import statement file extension
   * @default ".js"
   */
  suffix?: string
}

export const defineConfig = (config: TealinaConifg) => config

export const defineApiTemplates = (config: ApiTemplateType[]) => config

export const makeTemplate = (fn: CodeGenerateFuntion) => fn

export const makeTestSuiteTemplate = (fn: GenTestSuiteFnType) => fn
export const makeTestHelperTemplate = (fn: GenTestHelperFnType) => fn

export { convertToOpenApiJson } from './utils/genOpenApi'

// Type definition here can avoid all `.ts` files generate a `.d.ts`

export * from '@tealina/doc-types'

// gpure tyes ---- begin

export type MutationKind = 'CreateInput' | 'UpdateInput'

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

export interface PurifyConfig {
  /**
   *  Overwrite specific prop.type
   *  eg: OrderNo should be optional or exclude in OrderUpdateInput
   */
  overwrite?: Overwrite
  /** remap type, eg: DateTime => number */
  typeRemap?: (type: string) => string | null
}

// gpure tyes ---- end

export interface CreationCtx {
  dir?: string
  /** captialized directory name */
  Dir?: string
  filename: string
  Filename: string
  relative2api: string
  /** http method */
  method: string
}

type CodeGenerateFnType = (ctx: CreationCtx) => string

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
   * Where the file store
   */
  apiDir?: string
  /**
   * Short name for this template.\
   * one character, case sensitive.\
   * `*` means fallback, when both alias and name not matched
   */
  alias: string
  /**
   * Will be use as filename, can be empty string
   */
  name: string
  /**
   * Http Method
   * @default 'post'
   */
  method?: string
  /** Code generate function */
  generateFn: CodeGenerateFnType
}

export interface TealinaConifg {
  template: {
    handlers: ApiTemplateType[]
    /**  Generate integration test file */
    test: {
      genSuite: GenTestSuiteFnType
      genHelper?: GenTestHelperFnType
    }
  }
  /**
   * Where generated type file store
   */
  typesDir: string
  /**
   * Where generated integration test file store
   */
  testDir: string
  gpure?: PurifyConfig
  /** the import statement suffix @default {".js"} */
  suffix?: string
}

export const defineConfig = (config: TealinaConifg) => config

export const defineApiTemplates = (config: ApiTemplateType[]) => config

export const makeTemplate = (fn: CodeGenerateFnType) => fn

export const makeTestSuiteTemplate = (fn: GenTestSuiteFnType) => fn
export const makeTestHelperTemplate = (fn: GenTestHelperFnType) => fn

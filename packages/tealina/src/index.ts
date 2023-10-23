import { PurifyConfig } from './commands/gpure'

export * from '@tealina/doc-types'
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
  /**
   * Read for check whether the compilerOptions.moduleResulove is 'Bundelr'
   * @default "tsconfig.json" */
  tsconfigPath?: string
  gpure?: PurifyConfig
}

export const defineConfig = (config: TealinaConifg) => config

export const defineApiTemplates = (config: ApiTemplateType[]) => config

export const makeTemplate = (fn: CodeGenerateFnType) => fn

export const makeTestSuiteTemplate = (fn: GenTestSuiteFnType) => fn
export const makeTestHelperTemplate = (fn: GenTestHelperFnType) => fn

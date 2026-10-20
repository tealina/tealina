// Type definition here can avoid all `.ts` files generate a `.d.ts`
export type { OpenAPIV3_1, OpenAPIV3 } from 'openapi-types'
import type { ApiDoc } from '@tealina/doc-types'
export type GdocContext = {
  outputDir: string
  /** The configured api directory, spelled as the config spells it. */
  apiDir: string
  /** The public URL prefix the routes are served under. */
  baseURL: string
}

export type CustomOutputFn = (
  apiDoc: ApiDoc,
  context: GdocContext,
) => {
  content: string
  /** The storage location of the file contents */
  filePath: string
}

export interface GdocConfig {
  /** Keep the original output event customOutputs set. */
  keepOriginalOutput?: boolean
  customOutputs?: CustomOutputFn[]
}
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

export interface MatchForOptionalCheck extends MatheLocate {
  predicate: (prop: PropAST) => boolean
}

/** @deprecated use MatchForOptionalCheck */
export type MatchForOptionalChcek = MatchForOptionalCheck

export interface MatchForTypeTransform extends MatheLocate {
  transform: (prop: PropAST) => string
}

export interface MatchForExcludeProp extends MatheLocate {
  predicate: (prop: PropAST) => boolean
}

export interface Overwrite {
  isOptional?: MatchForOptionalCheck[]
  /** @deprecated use transformType */
  transofrmType?: MatchForTypeTransform[]
  transformType?: MatchForTypeTransform[]
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
  /**
   * The directory the file will be written into, spelled the way `apiDir` is — e.g.
   * `src/api/post` for the handler `tealina create post/order` writes. The file
   * does not exist yet, so this is all the generator can say about where it lands; a stub
   * measures its own import specifiers from it.
   */
  fileDir: string
  /** HTTP method (lowercase) */
  method: string
  /**
   * The extension the file will be written with — the configured `sourceExt`.
   *
   * A generator branches on it when it can emit more than one language: a project that
   * still keeps `.js` handlers sets `sourceExt: '.js'` and needs a JavaScript stub, while
   * a `.ts` project needs a TypeScript one.
   * @default ".ts"
   */
  sourceExt?: string
}

type CodeGenerateFuntion = (ctx: TemplateContext) => string

export type GenTestSuiteFnType = (ctx: {
  method: string
  route: string
  /** The directory the test file will be written into, as in `TemplateContext.fileDir`. */
  fileDir: string
}) => string

export type GenTestHelperFnType = (ctx: {
  /** The directory the helper will be written into, as in `TemplateContext.fileDir`. */
  fileDir: string
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
  name?: string

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

export interface TealinaConfig {
  /**
   * The directory whose file tree is the route table, e.g. `src/api`.
   *
   * The CLI no longer takes this as an argument. Every generated artifact has a fixed
   * name — `types/api.d.ts`, `docs/api.json`, `exports["./api"]` — so moving or renaming
   * this directory changes no public name. Only route discovery and the handlers' own
   * relative imports follow it.
   */
  apiDir: string
  /**
   * The URL prefix the routes answer under, e.g. `/api/v1`.
   *
   * This is a deployment choice, not something the CLI can infer from a directory name.
   * `gdoc` gives it to custom outputs through `GdocContext`, and it is what an OpenAPI
   * document is prefixed with.
   */
  apiBaseURL: string
  /**
   * Globs, relative to `apiDir`, whose files and directories are not routes.
   *
   * `align` already skips `index` files and dotfiles. This is for everything else a
   * project wants to colocate: `['_shared/**']`.
   */
  exclude?: string[]
  /**
   * The module specifier the fallback `types/api.d.ts` imports the handler types from.
   *
   * When the contract layer lives in another package — `core/handler`, in a scaffold whose
   * api version is a package of its own — a relative `./handler` does not resolve. This is
   * only the specifier; the suffix is not appended to it.
   *
   * @default "./handler" + `suffix`
   */
  handlerImport?: string
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
  /** Extension of the source files this generates — the index files and the
   * handler stub. Set it to ".js" for a JavaScript project.
   *
   * Deliberately not the same knob as `suffix`: that one is what the generated
   * `import` statements say, and the two are only equal by coincidence. Under
   * `moduleResolution: NodeNext` a TypeScript project writes `import './x.js'`
   * and still names the file `x.ts`, which is why the default here is ".ts".
   * @default ".ts"
   */
  sourceExt?: string
}

/** @deprecated use TealinaConfig */
export type TealinaConifg = TealinaConfig

export const defineConfig = (config: TealinaConfig) => config

export const defineApiTemplates = (config: ApiTemplateType[]) => config

export const makeTemplate = (fn: CodeGenerateFuntion) => fn

export const makeTestSuiteTemplate = (fn: GenTestSuiteFnType) => fn
export const makeTestHelperTemplate = (fn: GenTestHelperFnType) => fn
export { convertToOpenApiJson } from './utils/genOpenApi'

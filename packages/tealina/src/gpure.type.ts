// Type definition here can avoid each `.ts` files are generate a `.d.ts`

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

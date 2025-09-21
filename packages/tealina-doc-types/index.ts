import { ExampleItem, DocDataKeys } from '@tealina/utility-types'
export const DocKind = {
  /** eg: string,number */
  Primitive: 0,
  /** types that has method, eg: Date, File, Blob  */
  NonLiteralObject: 1,
  Tuple: 2,
  Union: 3,
  EntityRef: 4,
  Never: 5,
  Record: 6,
  StringLiteral: 7,
  NumberLiteral: 8,
  EnumRef: 9,
  EnumMemberRef: 10,
  Array: 11,
  RecursionTuple: 12,
  RecursionEntity: 13,
  LiteralObject: 14,
  ResponseEntity: 15,
} as const

export type DocKind = typeof DocKind

export interface Kind {
  isOptional?: true
  comment?: string
  jsDoc?: Partial<Record<string, string>>
}

export interface PrimitiveType extends Kind {
  kind: DocKind['Primitive']
  type: string
}

export interface ObjectType extends Kind {
  kind: DocKind['NonLiteralObject']
  type: string
}

export interface TupleType extends Kind {
  kind: DocKind['Tuple']
  elements: DocNode[]
}

export interface ArrayType extends Kind {
  kind: DocKind['Array']
  element: DocNode
}

export interface UnionType extends Kind {
  kind: DocKind['Union']
  types: DocNode[]
}

export interface RecordType extends Kind {
  // alias?: string
  // aliasComment?: string
  kind: DocKind['Record']
  key: DocNode
  value: DocNode
}

export interface RefType extends Kind {
  kind: DocKind['EntityRef']
  id: number
}

export interface EnumRefType extends Kind {
  kind: DocKind['EnumRef']
  id: number
}

export interface EnumMemberRefType extends Kind {
  kind: DocKind['EnumMemberRef']
  enumId: number
  memberId: number
}

export interface NeverType extends Kind {
  kind: DocKind['Never']
}

export interface NumberLiteral extends Kind {
  kind: DocKind['NumberLiteral']
  value: number
}

export interface StringLiteral extends Kind {
  kind: DocKind['StringLiteral']
  value: string
}

export interface RecursionTuple extends Kind {
  kind: DocKind['RecursionTuple']
  id: number
}

export interface RecursionEntity extends Kind {
  kind: DocKind['RecursionEntity']
  id: number
}

export interface LiteralEntity extends Kind {
  name?: string
  kind: DocKind['LiteralObject']
  props: PropType[]
  comment?: string
}

export type DocNode =
  | PrimitiveType
  | ObjectType
  | TupleType
  | UnionType
  | RefType
  | EnumRefType
  | EnumMemberRefType
  | RecordType
  | NumberLiteral
  | StringLiteral
  | NeverType
  | ArrayType
  | RecursionTuple
  | RecursionEntity
  | LiteralEntity
  | ResponseEntity

export type PropType = { name: string } & DocNode

/**
 * Declare response type with optional status code and headers
 */
export interface ResponseEntity extends Kind {
  kind: DocKind['ResponseEntity']
  statusCode?: number
  headers?: DocNode
  response?: DocNode
  comment?: string
}

export interface DocItem extends Partial<Record<DocDataKeys, DocNode>> {
  comment?: string
  examples?: Record<DocDataKeys, ExampleItem<{}>[] | Record<string, any>>
}

export interface Entity {
  name: string
  props: PropType[]
  comment?: string
}

export interface Entity {
  name: string
  props: PropType[]
  comment?: string
}

export interface EnumMember {
  memberId: number
  key: string
  value: NeverType | NumberLiteral | StringLiteral | PrimitiveType
}

export interface EnumEntity {
  name: string
  members: EnumMember[]
  comment?: string
}

export type TupleEntity = {
  name: string
  elements: DocNode[]
}

type HttpMethod = string
type Endpoint = string
type Id = number

export interface ApiDoc {
  apis: Record<HttpMethod, Record<Endpoint, DocItem>>
  entityRefs: Record<Id, Entity>
  enumRefs: Record<Id, EnumEntity>
  tupleRefs: Record<Id, TupleEntity>
  /**
   * The Tealina doc type version,
   * flow semver conventions.
   * format: [major].[minor]
   *  */
  docTypeVersion: number
}

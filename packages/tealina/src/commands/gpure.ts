import {
  asyncPipe,
  concat,
  filter,
  flat,
  groupBy,
  isEmpty,
  map,
  notNull,
  pickFn,
  pipe,
} from 'fp-lite'
import { BlockAST, PropAST, parseSchame } from '../utils/parsePrisma'
import { loadConfig } from '../utils/tool'
import { writeFile } from 'fs/promises'
import { TealinaComonOption } from '../utils/options'

/**
 * static declaration, inject on demand,
 * for avoid unnecesary reference to Prisma.
 */
const JSON_VALUE_TYPE = [
  '/**',
  '* From https://github.com/sindresorhus/type-fest/',
  '* Matches a JSON object.',
  '* This type can be useful to enforce some input to be JSON-compatible or as a super-type to be extended from. ',
  '*/',
  'export type JsonObject = {[Key in string]?: JsonValue}',
  '',
  '/**',
  '* From https://github.com/sindresorhus/type-fest/',
  '* Matches a JSON array.',
  '*/',
  'export interface JsonArray extends Array<JsonValue> {}',
  '',
  '/**',
  '* From https://github.com/sindresorhus/type-fest/',
  '* Matches any valid JSON value.',
  '*/',
  'export type JsonValue = string | number | boolean | JsonObject ',
]

const ENUMS_BEGIN = [
  '/**',
  '* Enums',
  '*/',
  '// Based on',
  '// https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275',
  '',
]

interface PurifyConfig {
  /**
   *  Overwrite specific prop.type
   *  eg: OrderNo should be optional or exclude in OrderUpdateInput
   */
  overwrite?: Overwrite
  /** remap type, eg: DateTime => number */
  typeRemap?: (type: string) => string | null
}

interface PurifyOption {
  input: string
  output: string
  namespace: string
}

type MutationKind = 'CreateInput' | 'UpdateInput'

interface MatheLocate {
  kind: MutationKind
  keyword: string
  blockName: string
}

interface MatchForOptionalChcek extends MatheLocate {
  predicate: (prop: PropAST) => boolean
}

interface MatchForTypeTransform extends MatheLocate {
  transform: (prop: PropAST) => string
}

interface MatchForExcludeProp extends MatheLocate {
  predicate: (prop: PropAST) => boolean
}

interface Overwrite {
  isOptional?: MatchForOptionalChcek[]
  transofrmType?: MatchForTypeTransform[]
  excludeProps?: MatchForExcludeProp[]
}

const formatComment = (lines: string[]) =>
  isEmpty(lines)
    ? []
    : lines.length == 1
    ? [`/** ${lines[0]} */`]
    : ['/**', ...lines.map(v => ` * ${v}`), ' */']

const byMatch = (block: BlockAST, kind: MutationKind) => (v: MatheLocate) =>
  v.blockName == block.name && v.keyword == block.keyword && v.kind == kind

const getSpace = (num: number) => Array(num).fill(' ').join('')

const TabSpace = getSpace(2)

/** https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#model-field-scalar-types */
const justMap = new Map<string, string>([
  ['BigInt', 'bigint'],
  ['Int', 'number'],
  ['Float', 'number'],
  ['Decimal', 'number'],
  ['String', 'string'],
  ['DateTime', 'Date | string'],
  ['Boolean', 'boolean'],
  ['Json', 'JsonValue'],
  ['Bytes', 'Buffer'],
])

type GetTsType = (x: PropAST) => string | null | undefined

const TypeTransformStrategies: GetTsType[] = [
  x => justMap.get(x.type),
  x => (x.type.startsWith('Unsupported') ? 'unknown' : null),
]

const PropsExcludeStategies: ((x: PropAST) => boolean)[] = [
  x => x.attribute.has('ignore'),
  x => x.attribute.has('relation'),
  x => x.kind == 'model',
]

const getFirstMatch = (strategies: GetTsType[]) => (x: PropAST) => {
  if (x.kind != 'scalarType') return x.type
  for (let i = 0; i < strategies.length; i++) {
    const v = strategies[i](x)
    if (v) return v
  }
  return 'any'
}

const useWhen = (s: string, isValid: boolean) => (isValid ? s : '')

const defaultConfig: Record<
  MutationKind,
  {
    checkOptional: (prop: PropAST) => boolean
    transformStrategies: GetTsType[]
  }
> = {
  CreateInput: {
    checkOptional: prop =>
      prop.modifier == '?' ||
      prop.attribute.has('updatedAt') ||
      prop.attribute.has('default'),
    transformStrategies: TypeTransformStrategies,
  },
  UpdateInput: {
    checkOptional: prop => true,
    transformStrategies: TypeTransformStrategies,
  },
}

const propDefaultAttr2comment = (prop: PropAST) => {
  const attr = prop.attribute.get('default')
  if (attr == null) return []
  return [`@default {${attr.slice(1, -1)}}`] // without brackets
}

const prop2ts =
  (option: {
    optinalChchek: (prop: PropAST) => boolean
    transformType: (prop: PropAST) => string
  }) =>
  (prop: PropAST) =>
    [
      ...formatComment(
        prop.comment.public.concat(propDefaultAttr2comment(prop)),
      ),
      [
        prop.name,
        useWhen('?', option.optinalChchek(prop)),
        ':',
        ' ',
        option.transformType(prop),
        useWhen('[]', prop.modifier == '[]'),
      ].join(''),
    ]

const block2ts =
  (option: {
    makeName: (block: BlockAST) => string
    checkIsOptional: (block: BlockAST) => (prop: PropAST) => boolean
    transformType: (block: BlockAST) => (prop: PropAST) => string
    notExclude: (block: BlockAST) => (prop: PropAST) => boolean
  }) =>
  (block: BlockAST) => {
    const commentLines = formatComment(block.comment.public)
    const headLine = [`interface ${option.makeName(block)}{`]
    const propLines = pipe(
      block.props,
      filter(option.notExclude(block)),
      map(
        prop2ts({
          optinalChchek: option.checkIsOptional(block),
          transformType: option.transformType(block),
        }),
      ),
      flat,
      map(v => [TabSpace, v].join('')), //indent
    )
    return [commentLines, headLine, propLines, '}', ''].flat()
  }

const findIsOptionalCheck = (
  block: BlockAST,
  kind: MutationKind,
  matches?: MatchForOptionalChcek[],
) => {
  if (matches == null) return null
  const target = matches.find(byMatch(block, kind))
  return target?.predicate
}

const findBlockSpecificTransform = (
  block: BlockAST,
  kind: MutationKind,
  matches?: MatchForTypeTransform[],
) => {
  if (matches == null) return null
  return matches.find(byMatch(block, kind))?.transform
}

const findBlockSpecificExclude = (
  block: BlockAST,
  kind: MutationKind,
  matches?: MatchForExcludeProp[],
) => {
  if (matches == null) return null
  return matches.find(byMatch(block, kind))?.predicate
}

const toFilterFn =
  (predicates: ((x: PropAST) => boolean)[]) => (prop: PropAST) =>
    !predicates.some(fn => fn(prop))

const toDetermineFn =
  (predicates: ((x: PropAST) => boolean)[]) => (prop: PropAST) =>
    predicates.some(fn => fn(prop))

const makeMutationTsInterface = (
  kind: MutationKind,
  { overwrite, typeRemap }: PurifyConfig,
) =>
  block2ts({
    makeName: block => [block.name, kind].join(''),
    checkIsOptional: block =>
      toDetermineFn(
        [
          findIsOptionalCheck(block, kind, overwrite?.isOptional),
          defaultConfig[kind].checkOptional,
        ].filter(notNull),
      ),
    transformType: block =>
      getFirstMatch(
        [
          findBlockSpecificTransform(block, kind, overwrite?.transofrmType),
          typeRemap ? (prop: PropAST) => typeRemap(prop.type) : null,
          ...TypeTransformStrategies,
        ].filter(notNull),
      ),
    notExclude: block =>
      toFilterFn(
        [
          findBlockSpecificExclude(block, kind, overwrite?.excludeProps),
          ...PropsExcludeStategies,
        ].filter(notNull),
      ),
  })

const withoutBreckets = (x?: string) => (x == null ? null : x.slice(1, -1))

const enum2ts = ({ name, comment, props }: BlockAST): string[] => [
  ...formatComment(comment.public),
  `export const ${name}: {`,
  ...props.map(v =>
    [
      `${TabSpace}${v.name}`,
      withoutBreckets(v.attribute.get('map')) ?? `"${v.name}"`,
    ].join(': '),
  ),
  '}',
  `export type ${name} = (typeof ${name})[keyof typeof ${name}]`,
  '',
]

const ConcernedKeywords = ['model', 'enum', 'type']

const wrapperWith =
  ({ input, namespace }: PurifyOption) =>
  (lines: string[]) =>
    [
      ...formatComment([`Purified mutation types from [schema](${input})`]),
      `export namespace ${namespace} {`,
      '',
      ...lines.map(v => `${TabSpace}${v}`),
      '}',
    ]

const makeTypeCodes = (config: PurifyConfig) => (blockList: BlockAST[]) => {
  const hasJsonValue = blockList.some(v =>
    v.props.some(p => p.type == 'JsonValue'),
  )
  return pipe(
    blockList,
    groupBy(block => block.keyword),
    g =>
      pipe(
        g.get('model') ?? [],
        concat(g.get('type') ?? []),
        map(block =>
          pipe(
            makeMutationTsInterface('CreateInput', config)(block),
            concat(makeMutationTsInterface('UpdateInput', config)(block)),
          ),
        ),
        xs => {
          if (!g.has('enum')) return xs
          return pipe(
            xs,
            concat([ENUMS_BEGIN]),
            concat(g.get('enum')!.map(enum2ts)),
          )
        },
      ),
    flat,
    hasJsonValue ? concat(JSON_VALUE_TYPE) : x => x,
  )
}

const workflow = (config: PurifyOption & PurifyConfig) =>
  asyncPipe(
    parseSchame(config.input),
    filter(block => ConcernedKeywords.includes(block.keyword)),
    filter(block => !block.attribute.has('ignore')),
    makeTypeCodes(config),
    wrapperWith(config),
    xs => writeFile(config.output, xs.join('\n')),
  )

const generatePureTypes = async (option: TealinaComonOption & PurifyOption) => {
  const config = await loadConfig(option)
  const purifyConfig = config.gpure ?? {}
  return workflow({
    ...pickFn(option, 'input', 'namespace', 'output'),
    ...purifyConfig,
  })
}
export { generatePureTypes, workflow }
export type { PurifyConfig }

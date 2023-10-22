import {
  asyncFlow,
  concat,
  filter,
  flat,
  groupBy,
  isEmpty,
  map,
  peek,
  pipe,
} from 'fp-lite'
import { BlockAST, PropAST, parseSchame } from '../utils/parsePrisma-new'

interface PurifyOption {
  input: string
  output: string
  namespace: string
}

type MutationKind = 'CreateInput' | 'UpdateInput'

interface MatheLocate {
  when: MutationKind
  keyword: string
  blockName: string
}

interface MatchForOptionalChcek extends MatheLocate {
  checkFn: (prop: PropAST) => boolean
}

interface MatchForTypeTransform extends MatheLocate {
  transform: (prop: PropAST) => string
}

interface Overwrite {
  isOptional: MatchForOptionalChcek[]
  transofrmType: MatchForTypeTransform[]
}

const byMatch = (block: BlockAST, kind: MutationKind) => (v: MatheLocate) => {
  v.blockName == block.name && v.keyword == block.keyword && v.when == kind
}
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

const getFirstMatch = (strategies: GetTsType[], x: PropAST) => {
  for (let i = 0; i < strategies.length; i++) {
    const v = strategies[i](x)
    if (v) return v
  }
}

type GetTsType = (x: PropAST) => string | null | undefined

const typeTransformStrategies: GetTsType[] = [
  x => justMap.get(x.scalarType),
  x => (x.scalarType.startsWith('Unsupported') ? 'unknown' : null),
]

const formatComment = (lines: string[]) =>
  isEmpty(lines)
    ? []
    : lines.length == 1
    ? [`/** ${lines[0]} */`]
    : ['/**', ...lines.map(v => ` * ${v}`), ' */']

const useWhen = (s: string, isValid: boolean) => (isValid ? s : '')

const defaultTypeTranformer = (strategies: GetTsType[]) => (prop: PropAST) =>
  [
    getFirstMatch(strategies, prop) ?? 'any',
    useWhen('[]', prop.modifier == '[]'),
  ].join('')

const defaultConfig: Record<
  MutationKind,
  {
    checkOptional: (prop: PropAST) => boolean
    transformType: (porp: PropAST) => string | null
  }
> = {
  CreateInput: {
    checkOptional: prop =>
      prop.modifier == '?' ||
      prop.attribute.has('updatedAt') ||
      prop.attribute.has('default'),
    transformType: x => null,
  },
  UpdateInput: {
    checkOptional: prop => true,
    transformType: x => null,
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
      ].join(''),
    ]

const block2ts =
  (option: {
    makeName: (block: BlockAST) => string
    checkIsOptional: (block: BlockAST) => (prop: PropAST) => boolean
    transformType: (block: BlockAST) => (prop: PropAST) => string
  }) =>
  (block: BlockAST) => {
    const commentLines = formatComment(block.comment.public)
    const headLine = [`interface ${option.makeName(block)}{`]
    const propLines = pipe(
      block.props,
      filter(v => !v.attribute.has('ignore') && !v.attribute.has('relation')),
      map(
        prop2ts({
          optinalChchek: option.checkIsOptional(block),
          transformType: option.transformType(block),
        }),
      ),
      flat,
      map(v => [TabSpace, v].join('')), //indent
    )
    return [commentLines, headLine, propLines, '}'].flat()
  }

const findIsOptionalCheck = (
  block: BlockAST,
  kind: MutationKind,
  matches?: MatchForOptionalChcek[],
) => {
  if (matches == null) return defaultConfig[kind].checkOptional
  const target = matches.find(byMatch(block, kind))
  if (target == null) return defaultConfig[kind].checkOptional
  return target.checkFn
}

const findTypeTransformer = (
  block: BlockAST,
  kind: MutationKind,
  matches?: MatchForTypeTransform[],
) => {
  if (matches == null) return defaultConfig[kind].transformType
  const target = matches.find(byMatch(block, kind))
  if (target == null) return defaultConfig[kind].transformType
  return target.transform
}

const makeMutationTsInterface = (
  kind: MutationKind,
  tailStrategies: GetTsType[],
  overwrite?: Overwrite,
) =>
  block2ts({
    makeName: block => [block.name, kind].join(''),
    checkIsOptional: block =>
      findIsOptionalCheck(block, kind, overwrite?.isOptional),
    transformType: block =>
      defaultTypeTranformer(
        [
          overwrite?.transofrmType != null
            ? findTypeTransformer(block, kind, overwrite.transofrmType)
            : [],
          typeTransformStrategies,
          tailStrategies,
        ].flat(),
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

const acceptKeywords = ['model', 'enum', 'type']
const matchBlockNames = (g: Map<string, BlockAST[]>) =>
  pipe(
    g.get('type') ?? [],
    concat(g.get('enum') ?? []),
    map(v => v.name),
    names => (prop: PropAST) =>
      names.includes(prop.scalarType) ? prop.scalarType : null,
  )

const workFlow = asyncFlow(
  parseSchame,
  filter(block => acceptKeywords.includes(block.keyword)),
  filter(block => !block.attribute.has('ignore')),
  groupBy(block => block.keyword), //todo add ctxtual prop to ast
  g =>
    pipe(
      g.get('model') ?? [],
      concat(g.get('type') ?? []),
      map(block => {
        const stategy = [matchBlockNames(g)]
        return pipe(
          makeMutationTsInterface('CreateInput', stategy)(block),
          concat(makeMutationTsInterface('UpdateInput', stategy)(block)),
        )
      }),
      concat((g.get('enum') ?? []).map(enum2ts)),
    ),
  flat,
  xs => xs.join('\n'),
)

export { workFlow }

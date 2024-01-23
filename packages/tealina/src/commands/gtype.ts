import chalk from 'chalk'
import consola from 'consola'
import {
  asyncPipe,
  concat,
  filter,
  flat,
  flow,
  groupBy,
  isEmpty,
  map,
  notNull,
  pickFn,
  pipe,
} from 'fp-lite'
import { writeFile } from 'fs/promises'
import path from 'node:path'
import type { GtypeConfig } from '..'
import type {
  BlockAST,
  MatchForExcludeProp,
  MatchForOptionalChcek as MatchForOptionalCheck,
  MatchForTypeTransform,
  MatheLocate,
  MutationKind,
  PropAST,
} from '../index'
import { parseSchame } from '../utils/parsePrisma'
import { FullOptions } from './capi'

const ENUMS_BEGIN = [
  '/**',
  '* Enums',
  '*/',
  '// Based on',
  '// https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275',
  '',
]
interface PurifyOption {
  input: string
  output: string
  namespace: string
}

const formatComment = (lines: string[]) =>
  isEmpty(lines)
    ? []
    : lines.length == 1
    ? [`/** ${lines[0]} */`]
    : ['/**', ...lines.map(v => ` * ${v}`), ' */']

const isMatch = (a: string, b: string) => a == '*' || a == b

const byMatch = (block: BlockAST, kind: MutationKind) => (v: MatheLocate) =>
  isMatch(v.blockName, block.name) &&
  isMatch(v.keyword, block.keyword) &&
  isMatch(v.kind, kind)

const getSpace = (num: number) => Array(num).fill(' ').join('')

const TabSpace = getSpace(2)

/** https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#model-field-scalar-types */
const justMap = new Map<string, string>([
  ['BigInt', 'bigint'],
  ['Int', 'number'],
  ['Float', 'number'],
  ['Decimal', 'number'],
  ['String', 'string'],
  ['DateTime', 'Date'],
  ['Boolean', 'boolean'],
  ['Json', 'JsonValue'],
  ['Bytes', 'Buffer'],
])

type GetTsType = (x: PropAST) => string | null | undefined

const TypeTransformStrategies: GetTsType[] = [
  x => justMap.get(x.type),
  x => (x.type.startsWith('Unsupported') ? 'unknown' : null),
  x => (x.kind != 'model' ? x.type : null),
]

const PropsExcludeStategies: ((x: PropAST) => boolean)[] = [
  x => x.attribute.has('ignore'),
  x => x.attribute.has('relation'),
  x => x.kind == 'model',
]

const getFirstMatch = (strategies: GetTsType[]) => (x: PropAST) => {
  for (let i = 0, len = strategies.length; i < len; i++) {
    const v = strategies[i](x)
    if (v) return v
  }
  return 'any'
}

const useWhen = (s: string, isValid: boolean) => (isValid ? s : '')

const defaultConfig: Record<
  Exclude<MutationKind, ''>,
  {
    checkOptional: (prop: PropAST) => boolean
  }
> = {
  CreateInput: {
    checkOptional: prop =>
      prop.modifier == '?' ||
      prop.attribute.has('updatedAt') ||
      prop.attribute.has('default'),
  },
  UpdateInput: {
    checkOptional: prop => true,
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
    exclude: (block: BlockAST) => (prop: PropAST) => boolean
  }) =>
  (block: BlockAST) => {
    const commentLines = formatComment(block.comment.public)
    const headLine = [`interface ${option.makeName(block)} {`]
    const propLines = pipe(
      block.props,
      filter(option.exclude(block)),
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
  matches?: MatchForOptionalCheck[],
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

const makeCompositeTypeBy = (kind: MutationKind) => (prop: PropAST) =>
  prop.kind == 'compositeType' ? [prop.type, kind].join('') : null

const makeTsInterface = ({ overwrite }: GtypeConfig) =>
  block2ts({
    makeName: block => block.name,
    checkIsOptional: _block => _prop => false, //use null instead
    transformType: block => prop => {
      const fn = getFirstMatch(
        [
          findBlockSpecificTransform(block, '', overwrite?.transofrmType),
          ...TypeTransformStrategies,
        ].filter(notNull),
      )
      const type = fn(prop)
      return prop.modifier == '?' ? [type, 'null'].join(' | ') : type
    },
    exclude: _block =>
      toFilterFn([
        x => x.type.startsWith('Unsupported'),
        ...PropsExcludeStategies,
      ]),
  })

const getActualTransformer = (
  block: BlockAST,
  kind: MutationKind,
  overwrite: GtypeConfig['overwrite'],
  typeRemap: GtypeConfig['typeRemap'],
): ((prop: PropAST) => string) => {
  const fn = getFirstMatch(
    [
      findBlockSpecificTransform(block, kind, overwrite?.transofrmType),
      typeRemap ? (prop: PropAST) => typeRemap(prop.type) : null,
      makeCompositeTypeBy('CreateInput'), //always create input for compositeType
      ...TypeTransformStrategies,
    ].filter(notNull),
  )
  if (kind != 'UpdateInput') return fn
  return (prop: PropAST) => {
    const type = fn(prop)
    return prop.modifier == '?' ? [type, 'null'].join(' | ') : type
  }
}

const makeMutationTsInterface = (
  kind: Exclude<MutationKind, ''>,
  { overwrite, typeRemap }: GtypeConfig,
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
      getActualTransformer(block, kind, overwrite, typeRemap),
    exclude: block =>
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

const calcRelativeInputPath = (input: string, output: string) => {
  const fullOutPutPathArr = path.resolve(output).split(path.sep)
  const fullInputPutPathArr = path.resolve(input).split(path.sep)
  const outPathLen = fullOutPutPathArr.length
  const inputPathLen = fullInputPutPathArr.length
  const min = Math.min(outPathLen, inputPathLen)
  const sameParentIndex = Array(min)
    .fill(0)
    .findIndex((_v, i) => fullInputPutPathArr[i] != fullOutPutPathArr[i])
  const relativeInputPath = path.relative(
    fullOutPutPathArr.slice(sameParentIndex + 1).join('/'),
    fullInputPutPathArr.slice(sameParentIndex).join('/'),
  )
  return relativeInputPath
}

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

const wrapperWith =
  ({ input, output, namespace }: PurifyOption) =>
  (lines: string[]) => {
    const relativeInputPath = calcRelativeInputPath(input, output)
    return [
      ...formatComment([
        `Purified mutation types from [schema](${relativeInputPath})`,
      ]),
      `export namespace ${namespace} {`,
      ...lines.map(v => `${TabSpace}${v}`),
      '}',
      '',
    ]
  }

const isJsonValueIn = (blockList: BlockAST[]) =>
  blockList.some(v => v.props.some(p => p.type == 'JsonValue'))

type MainTranformType = (block: BlockAST) => string[]

const prepareMainTransformer = (config: GtypeConfig): MainTranformType => {
  const makers = [
    makeTsInterface(config),
    makeMutationTsInterface('CreateInput', config),
    makeMutationTsInterface('UpdateInput', config),
  ]
  const toTsInterface: MainTranformType = block =>
    pipe(
      makers,
      map(fn => fn(block)),
      flat,
    )
  return toTsInterface
}

const makeTypeCodes =
  (toTsInterface: MainTranformType) => (blockList: BlockAST[]) => {
    return pipe(
      blockList,
      groupBy(block => block.keyword),
      g =>
        pipe(
          g.get('model') ?? [],
          concat(g.get('type') ?? []),
          map(toTsInterface),
          g.has('enum')
            ? flow(concat([ENUMS_BEGIN]), concat(g.get('enum')!.map(enum2ts)))
            : x => x,
        ),
      flat,
      isJsonValueIn(blockList) ? concat(JSON_VALUE_TYPE) : x => x,
    )
  }

const workflow = (input: string, config: GtypeConfig) =>
  asyncPipe(
    parseSchame(input),
    filter(block => ConcernedKeywords.includes(block.keyword)),
    filter(block => !block.attribute.has('ignore')),
    pipe(config, prepareMainTransformer, makeTypeCodes),
  )

type GtypeOption = Required<
  Pick<FullOptions, 'gtype' | 'output' | 'input' | 'namespace'>
>
const pickOption4gtype = (full: FullOptions): GtypeOption => {
  const x = pickFn(full, 'gtype', 'gpure', 'output', 'input', 'namespace')
  const output = x.output ?? 'types/pure.d.ts'
  const gtype = x.gtype ?? x.gpure ?? {}
  return { ...x, output, gtype }
}
const generatePureTypes = async (option: GtypeOption) => {
  const lines = await workflow(option.input, option.gtype)
  return pipe(
    lines,
    wrapperWith(option),
    xs => writeFile(option.output, xs.join('\n')),
    () => chalk.green('Types Generated, save at: ' + option.output),
    consola.success,
  )
}
export { generatePureTypes, pickOption4gtype, workflow }
export type { GtypeConfig as PurifyConfig }

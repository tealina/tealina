import { filter, flow, map, notNull, unique } from 'fp-lite'
import chalk from 'chalk'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  BlockRange,
  LineInfo,
  clearSymbol,
  getBlockComment,
  makeLineParser,
  parseSchema,
  toFindable,
} from '../utils/parsePrisma.js'

const ArgsValuePattern = /".*"/
/**
 * static declaration, inject on demand,
 * for avoid unnecesary reference to Prisma.
 */
const JSON_VALUE_TYPE = [
  '\t/**',
  '\t* From https://github.com/sindresorhus/type-fest/',
  '\t* Matches a JSON object.',
  '\t* This type can be useful to enforce some input to be JSON-compatible or as a super-type to be extended from. ',
  '\t*/',
  '\texport type JsonObject = {[Key in string]?: JsonValue}',
  '\t',
  '\t/**',
  '\t* From https://github.com/sindresorhus/type-fest/',
  '\t* Matches a JSON array.',
  '\t*/',
  '\texport interface JsonArray extends Array<JsonValue> {}',
  '\t',
  '\t/**',
  '\t* From https://github.com/sindresorhus/type-fest/',
  '\t* Matches any valid JSON value.',
  '\t*/',
  '\texport type JsonValue = string | number | boolean | JsonObject ',
]

const ENUMS_BEGIN = [
  '\t/**',
  '\t * Enums',
  '\t */',
  '\t// Based on',
  '\t// https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275',
  '',
]

/** https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#model-field-scalar-types */
const toTsType = (dslType: string) => {
  switch (dslType) {
    case 'BigInt':
      return 'bigint'
    case 'Int':
    case 'Float':
    case 'Decimal':
      return 'number'
    case 'String':
      return 'string'
    case 'DateTime':
      return 'Date | string'
    case 'Boolean':
      return 'boolean'
    case 'Json':
      return 'JsonValue'
    case 'Bytes':
      return 'Buffer'
    default: //Unsupported('*')
      return 'unknow'
  }
}

interface TypeColumn {
  name: string
  modifier: {
    questionMarke?: boolean
    list?: boolean
  }
  contextual: {
    isModel?: boolean
    isCompositeType?: boolean
    isEnum?: boolean
  }
}

/**
 * in line, single @ attributes
 */
interface AttributesColumn {
  default?: string
  id?: boolean
  objectId?: boolean
  updatedAt?: boolean
  ignore?: boolean
  // relation?: { fields: string[] }
}

interface Property {
  name: string
  type: TypeColumn
  comments: string[]
  attributes: AttributesColumn
}

interface Detail {
  comments: string[]
  name: string
  props: Property[]
  // attributes: RowAttributes
}

interface EnumMemeber {
  name: string
  value: string
  comment: string[]
}

interface EnumDetail {
  comments: string[]
  name: string
  props: EnumMemeber[]
  // attributes: RowAttributes
}

const makeTypeColParser = (
  str: string,
  getContextual: (name: string) => TypeColumn['contextual'],
): TypeColumn => {
  const name = clearSymbol(str)
  return {
    name,
    modifier: {
      questionMarke: str.includes('?'),
      list: str.includes('['),
    },
    contextual: getContextual(name),
  }
}

type InputTypeKind = 'Create' | 'Update'

const makeTypeName = (kind: InputTypeKind, target: string) =>
  [target, kind, 'Input'].join('')

const parseAttrCol = (attrPart: string): AttributesColumn => {
  const attrs = attrPart
    .split('@')
    .map(v => v.trim())
    .filter(v => v.length > 0)
  const DefoIndentifier = 'default('
  const defo = attrs.find(v => v.startsWith(DefoIndentifier))
  return {
    // ...extraRelationInfo(attrs),
    default: defo ? defo.slice(DefoIndentifier.length, -1) : void 0,
    objectId: attrs.includes('db.ObjectId'),
    id: attrs.includes('id'),
    ignore: attrs.includes('ignore'),
    updatedAt: attrs.includes('updatedAt'),
  }
}

const checkIsOptional = (x: Property): boolean => {
  const {
    type: { modifier },
    attributes,
  } = x
  return [
    modifier.questionMarke,
    modifier.list,
    attributes.default,
    attributes.updatedAt,
  ].some(v => !!v) //false,null,undefined
}

const parseModelAndType = (schema: string[]) => {
  const { findBlocks, takeBlockName } = toFindable(schema)
  const typeBlocks = findBlocks('type')
  const modelBlocks = findBlocks('model')
  const enumBlocks = findBlocks('enum')
  const enumNames = enumBlocks.map(takeBlockName)
  const subDocNames = typeBlocks.map(takeBlockName)
  const modelNames = modelBlocks.map(takeBlockName)
  const getContextual = (name: string): TypeColumn['contextual'] => ({
    isEnum: enumNames.includes(name),
    isCompositeType: subDocNames.includes(name),
    isModel: modelNames.includes(name),
  })
  const parseCol = (v: LineInfo): Property => {
    const [attrPart, tailComment] = v.restCol.join(' ').split('///')
    return {
      name: v.fisrtCol,
      type: makeTypeColParser(v.secondCol, getContextual),
      attributes: parseAttrCol(attrPart),
      comments: [...v.lineComment, tailComment].filter(notNull),
    }
  }
  const withoutIgnored = ({ lines }: BlockInfo) =>
    !lines.some(line => line.trimStart().startsWith('@@ignore'))
  const toBlockInfo = (blockRange: BlockRange) => ({
    block: blockRange,
    lines: schema.slice(blockRange.begin + 1, blockRange.end - 1),
  })
  interface BlockInfo {
    block: BlockRange
    lines: string[]
  }
  const parseLine = flow(
    map(makeLineParser()),
    filter(notNull),
    map(parseCol),
    filter(v => !v.attributes.ignore),
  )
  const toDetail = ({ block, lines }: BlockInfo): Detail => ({
    comments: getBlockComment(schema, block),
    name: takeBlockName(block)!,
    props: parseLine(lines),
  })
  const parseEnumLine = flow(
    map(makeLineParser()),
    filter(notNull),
    map(parseEnumCol),
    filter(notNull),
  )
  const toEnumDetail = ({ block, lines }: BlockInfo): EnumDetail => ({
    comments: getBlockComment(schema, block),
    name: takeBlockName(block)!,
    props: parseEnumLine(lines),
  })
  const workFlow = flow(map(toBlockInfo), filter(withoutIgnored), map(toDetail))
  const enumWorkFlow = flow(
    map(toBlockInfo),
    filter(withoutIgnored),
    map(toEnumDetail),
  )
  const models = workFlow(modelBlocks)
  const types = workFlow(typeBlocks)
  const enums = enumWorkFlow(enumBlocks)
  return { models, types, enums }
}

const enumTemplate = (entity: EnumDetail) => [
  formatComment('\t', entity.comments),
  `\texport const ${entity.name}: {`,
  ...entity.props.map(v => [`\t\t${v.name}`, v.value].join(': ')),
  '\t}',
  `\texport type ${entity.name} = (typeof ${entity.name})[keyof typeof ${entity.name}]`,
  '',
]

const getPropComment = ({ comments, attributes }: Property) => [
  ...comments,
  ...(attributes.default ? [`@default {${attributes.default}}`] : []),
]

const formatComment = (indent: string, comments: string[]) => {
  const commentLength = comments.length
  const formatedComment =
    commentLength == 1
      ? [`${indent}/**`, comments[0].trim(), '*/'].join(' ')
      : commentLength > 1
      ? [
          [`${indent}/**`, ...comments.map(v => v.trimStart())].join(
            `\n${indent} * `,
          ),
          `${indent} */`,
        ].join('\n')
      : ''
  return formatedComment
}

const valueFromMapAttribute = (attrs: string[]) => {
  const mapFn = attrs.find(v => v.startsWith('map'))
  if (mapFn == null) return null
  const vs = mapFn.match(ArgsValuePattern)
  return vs != null ? vs[0] : null
}

const parseEnumCol = (v: LineInfo): EnumMemeber | null => {
  const [attrPart, tailComment] = (v.secondCol ?? '').split('///')
  const attrs = attrPart.split('@')
  if (attrs.some(v => v.startsWith('ingnore'))) return null
  return {
    name: v.fisrtCol,
    value: valueFromMapAttribute(attrs) ?? `"${v.fisrtCol}"`,
    comment: [...v.lineComment, tailComment].filter(notNull),
  }
}

const makeTsTransformer =
  (calcIsOptional: (p: Property) => boolean) =>
  (kind: InputTypeKind) =>
  (p: Property) => {
    const { type } = p
    const { modifier, contextual } = type
    const tsType = contextual.isCompositeType
      ? makeTypeName(kind, type.name)
      : contextual.isEnum
      ? type.name
      : toTsType(type.name)
    const result = [
      '\t\t',
      p.name,
      calcIsOptional(p) ? '?' : '',
      ': ',
      contextual.isEnum ? `${p.type.name}` : tsType,
      modifier.list ? '[]' : '',
    ].join('')
    const formatedComment = formatComment('\t\t', getPropComment(p))
    return formatedComment.length > 1
      ? [formatedComment, result].join('\n')
      : result
  }

const withoutId = (p: Property): boolean =>
  !(p.attributes.id && p.attributes.default != null)

const makeMutationTsInterface =
  (config: PurifyOption, kind: InputTypeKind) => (detail: Detail) => {
    const { name, props, comments } = detail
    const transmform2ts = makeTsTransformer(
      kind == 'Update' ? p => true : checkIsOptional,
    )
    const pureProps = props
      .filter(withoutId)
      .filter(v => !v.type.contextual.isModel)
    const lines = pureProps.map(transmform2ts(kind))
    return [
      ...(comments.length ? [formatComment('\t', comments)] : []),
      `\texport interface ${makeTypeName(kind, name)} {`,
      ...lines,
      '\t}',
      '',
    ]
  }

type ParsedType = ReturnType<typeof parseModelAndType>

const makePureTypes = (
  { models, types, enums }: ParsedType,
  config: PurifyOption,
) => {
  const makeCreateInputInterface = makeMutationTsInterface(config, 'Create')
  const makeUpdateInputInterface = makeMutationTsInterface(config, 'Update')
  const makeInterfaces = (m: Detail): string[] => [
    ...makeCreateInputInterface(m),
    ...makeUpdateInputInterface(m),
  ]
  const pureInterface = [
    ...models.map(makeInterfaces),
    ...types.map(makeInterfaces),
    ...(enums.length > 0 ? ENUMS_BEGIN : []),
    ...enums.map(enumTemplate),
  ]
    .flat()
    .join('\n')
  return pureInterface
}

const makeFullContent = (
  { namespace, output, input }: PurifyOption,
  pureInterface: string,
  hasJsonType: boolean,
) => {
  const cwd = process.cwd()
  const relative = path.relative(path.dirname(output), cwd)
  const fullInput = path.resolve(input)
  const fromPath = path.join(relative, fullInput.slice(cwd.length))
  const comment = [
    '/**',
    ` * Purified prisma mutation types from [schema](${fromPath})\\`,
    ' * Generated by command ```tealina gpure```\\',
    ' */',
  ]
  const content = [
    ...comment,
    `export namespace ${namespace} {`,
    pureInterface,
    ...(hasJsonType ? [JSON_VALUE_TYPE.join('\n')] : []),
    '}',
  ].join('\n')
  return content
}

interface PurifyOption {
  input: string
  output: string
  namespace: string
}

const checkHasJsonType = ({ models, types }: ParsedType) => {
  const findFlow = flow(
    (v: Detail) => v.props,
    map(p => p.type.name),
    unique,
    xs => xs.some(v => v == 'Json'),
  )
  const hasJsonType = models.some(findFlow) || types.some(findFlow)
  return hasJsonType
}

const generatePureTypes = async (config: PurifyOption) => {
  const schema = await parseSchema(config.input)
  const details = parseModelAndType(schema)
  const content = makePureTypes(details, config)
  const fullContent = makeFullContent(
    config,
    content,
    checkHasJsonType(details),
  )
  await fs.writeFile(config.output, fullContent)
  console.log(chalk.green(`Generated success! output path : ${config.output}`))
}

export {
  generatePureTypes,
  parseModelAndType,
  makePureTypes,
  JSON_VALUE_TYPE,
  ENUMS_BEGIN,
}

import { asyncFlow, filter, flow, map, pipe } from 'fp-lite'
import { readFile } from 'fs/promises'

type CommentType = Record<'private' | 'public', string[]>

type BlockAST = {
  name: string
  comment: CommentType
  keyword: string
  props: PropAST[]
  attribute: Map<string, string>
}

type PropAST = {
  name: string
  comment: CommentType
  modifier?: string
  attribute: Map<string, string>
  type: string
  kind: 'scalarType' | 'model' | 'enum' | 'compositeType'
}

type KindFinderFn = (v: string) => PropAST['kind']

const CommentPattern = /^[/]/
const LeftBreackPattern = /{$/
const PrivateCommentPattern = new RegExp('^//')
const PublicCommentPattern = new RegExp('^///')
const InBreackPairsPattern = /\(.*\)/
const MultipleAtSymbolPattern = /@+/
const BlockLeadEndPattern = /{$/
const RegionBegin = new RegExp('^#region')
const RegionEnd = new RegExp('^#endregion')

const isPrivateComment = (line: string) => PrivateCommentPattern.test(line)
const isPublicComment = (line: string) => PublicCommentPattern.test(line)
const isCommentLine = (line: string) => CommentPattern.test(line)
const isEndOfBlock = (line: string) => line == '}'
const isBeginOfBlock = (line: string) => LeftBreackPattern.test(line)

const each = <T>(xs: T[], fn: (x: T) => void) => {
  const len = xs.length
  for (let i = 0; i < len; i++) {
    fn(xs[i])
  }
}

const groupAndPick =
  <T, K, V>(getKey: (x: T) => K, getValue: (x: T) => V) =>
  (xs: T[]) => {
    const record = new Map<K, V[]>()
    each(xs, v => {
      const key = getKey(v)
      const list = record.get(key)
      list ? list.push(getValue(v)) : record.set(key, [getValue(v)])
    })
    return record
  }

const collectBlockNames = (matcher = /^(model)|^(type)|^(enum)/) =>
  flow(
    filter((line: string) => BlockLeadEndPattern.test(line)),
    filter(line => !isCommentLine(line)),
    filter(line => matcher.test(line)),
    map(line =>
      pipe(
        line.split(' '),
        filter(col => col.length > 0),
        ([keyword, name]) => ({ keyword, name }),
      ),
    ),
    groupAndPick(
      v => v.keyword,
      v => v.name,
    ),
  )

const separeBlock = (lines: string[]) => {
  const blockList: string[][] = [[]]
  each(lines, line => {
    if (line.length === 0) return
    const block = blockList.at(-1)!
    if (isEndOfBlock(line)) {
      blockList.push([])
      return
    }
    block.push(line)
  })
  blockList.pop() //last one is empty
  return blockList
}

const collectBlockHeadInfo = (
  comment: CommentType,
  line: string,
): Omit<BlockAST, 'props' | 'attribute'> => {
  const [keyword, name] = line.split(' ')
  return { comment, keyword, name }
}

const separeScalarType = (col: string): Pick<PropAST, 'type' | 'modifier'> => {
  if (col.includes('?')) {
    const [type] = col.split('?')
    return { type, modifier: '?' }
  }
  if (col.includes('[')) {
    const [type] = col.split('[')
    return { type, modifier: '[]' }
  }
  return { type: col }
}

const separeAttribuite = (attr: string) =>
  pipe(
    attr.match(InBreackPairsPattern) ?? [''],
    ([params]) => [attr.slice(0, attr.length - params.length), params] as const,
  )

const attrCol2obj = (str: string): Map<string, string> =>
  pipe(
    str.split('@'),
    xs => (xs[0] === '' ? xs.slice(1) : xs),
    map(flow(v => v.trim(), separeAttribuite)),
    kvs => new Map(kvs),
  )

const makeDefaultComment = (): CommentType => ({
  private: [],
  public: [],
})

const assignComment = (comment: CommentType, line: string) => {
  if (isPublicComment(line)) {
    comment.public.push(line.slice(3))
    return true
  }
  if (!isPrivateComment(line)) return false
  const content = line.slice(2)
  if (RegionBegin.test(content) || RegionEnd.test(content)) {
    return true
  }
  comment.private.push(content)
  return true
}

const parseRestColums = (rest: string[]) => {
  const mixed = rest.join(' ').trim()
  if (mixed.length < 1) {
    return { scalarTypeAndModifier: '', attributesAndInlineComment: '' }
  }
  if (mixed[0] === '@' || mixed[0] === '/') {
    return { scalarTypeAndModifier: '', attributesAndInlineComment: mixed }
  }
  const [scalarTypeAndModifier, ...tails] = mixed.split(' ')
  return { scalarTypeAndModifier, attributesAndInlineComment: tails.join(' ') }
}

const collectBockProps =
  (kindFinder: KindFinderFn) =>
  (comment: CommentType, line: string): PropAST => {
    const [name, ...rest] = line.split(' ').filter(col => col.length > 0)
    const { scalarTypeAndModifier, attributesAndInlineComment } =
      parseRestColums(rest)
    const typeInfo = separeScalarType(scalarTypeAndModifier)
    const slashIndex = attributesAndInlineComment.indexOf('/')
    let attr = attributesAndInlineComment
    if (slashIndex > -1) {
      attr = attr.slice(0, slashIndex)
      const inlineComment = attributesAndInlineComment.slice(slashIndex)
      assignComment(comment, inlineComment)
    }
    const attribute = attrCol2obj(attr)
    return {
      name,
      ...typeInfo,
      attribute,
      comment,
      kind: kindFinder(typeInfo.type),
    }
  }

const walkLinesWithComment = <R>(
  lines: string[],
  handler: (comment: CommentType, line: string) => R,
) => {
  let comment = makeDefaultComment()
  const results: R[] = []
  each(lines, line => {
    if (assignComment(comment, line)) return
    results.push(handler(comment, line))
    comment = makeDefaultComment()
  })
  return results
}

const separeScope = (lines: string[]) => {
  const beginIndex = lines.findIndex(
    line => !isCommentLine(line) && isBeginOfBlock(line),
  )
  const headLines = lines.slice(0, beginIndex + 1)
  const blockAttrIndex = lines.findIndex(v => v.startsWith('@'))
  const blockAttrLines = blockAttrIndex > -1 ? lines.slice(blockAttrIndex) : []
  const propsLines = lines.slice(
    beginIndex + 1,
    lines.length - blockAttrLines.length,
  )
  return { headLines, propsLines, blockAttrLines }
}

const toBlockAST =
  (kindFinder: KindFinderFn) =>
  (lines: string[]): BlockAST => {
    const { headLines, propsLines, blockAttrLines } = separeScope(lines)
    const [blockHead] = walkLinesWithComment(headLines, collectBlockHeadInfo)
    const props = walkLinesWithComment(propsLines, collectBockProps(kindFinder))
    const attribute = pipe(
      blockAttrLines,
      map(v => v.replace(MultipleAtSymbolPattern, '')),
      map(separeAttribuite),
      kvs => new Map(kvs),
    )
    return { ...blockHead, props, attribute }
  }

const readSchema = (shemaFilePath: string) =>
  readFile(shemaFilePath).then(v => v.toString('utf-8').split('\n'))

const makeKindFinder = (nameGroup: Map<string, string[]>) => {
  const modelNames = nameGroup.get('model') ?? []
  const typeNames = nameGroup.get('type') ?? []
  const enumNames = nameGroup.get('enum') ?? []
  const findCorrectKind = (type: string): PropAST['kind'] => {
    if (modelNames.includes(type)) return 'model'
    if (enumNames.includes(type)) return 'enum'
    if (typeNames.includes(type)) return 'compositeType'
    return 'scalarType'
  }
  return findCorrectKind
}

const mainFlow = (lines: string[]) =>
  pipe(lines, collectBlockNames(), makeKindFinder, kindFinder =>
    pipe(lines, separeBlock, map(toBlockAST(kindFinder))),
  )

const parseSchame = asyncFlow(
  readSchema,
  map(v => v.trim()),
  mainFlow,
)

const extraModelNames = asyncFlow(readSchema, collectBlockNames(/^(model)/))

export { extraModelNames, parseSchame }
export type { BlockAST, PropAST }

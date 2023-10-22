import { asyncFlow, filter, flow, map, pipe } from 'fp-lite'
import { readFile } from 'fs/promises'

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
  scalarType: string
}

const CommentPattern = /^[/]/
const LeftBreackPattern = /{$/
const PrivateCommentPattern = new RegExp('^// ')
const PublicCommentPattern = new RegExp('^/// ')
const InBreackPairsPattern = /\(.*\)/
const MultipleAtSymbolPattern = /@+/

const isPrivateComment = (line: string) => PrivateCommentPattern.test(line)
const isPublicComment = (line: string) => PublicCommentPattern.test(line)
const isCommentLine = (line: string) => CommentPattern.test(line)
const isEndOfBlock = (line: string) => line == '}'
const isBeginOfBlock = (line: string) => LeftBreackPattern.test(line)

const groupAndPick =
  <T, K, V>(getKey: (x: T) => K, getValue: (x: T) => V) =>
  (xs: T[]) => {
    const record = new Map<K, V[]>()
    let len = xs.length
    for (let i = 0; i < len; i++) {
      const v = xs[i]
      const key = getKey(v)
      const list = record.get(key)
      list ? list.push(getValue(v)) : record.set(key, [getValue(v)])
    }
    return record
  }

const collectBlockNames =
  (matcher = /^(model)|^(type)|^(enum)/) =>
  (lines: string[]): Map<string, string[]> => {
    const EndPattern = /{$/
    return pipe(
      lines,
      filter(line => EndPattern.test(line)),
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
  }

const separeBlock = (lines: string[]) => {
  const len = lines.length
  const blockList: string[][] = [[]]
  for (let i = 0; i < len; i++) {
    const line = lines[i].trim()
    if (line.length == 0) {
      continue
    }
    const block = blockList.at(-1)!
    if (isEndOfBlock(line)) {
      blockList.push([])
      continue
    }
    block.push(line)
  }
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

const separeScalarType = (col: string) => {
  if (col.includes('?')) {
    const [scalarType] = col.split('?')
    return { scalarType, modifier: '?' }
  }
  if (col.includes('[')) {
    const [scalarType] = col.split('[')
    return { scalarType, modifier: '[]' }
  }
  return { scalarType: col }
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

type CommentType = Record<'private' | 'public', string[]>

const makeDefaultComment = (): CommentType => ({
  private: [],
  public: [],
})

const assignComment = (comment: CommentType, line: string) => {
  if (isPrivateComment(line)) {
    comment.private.push(line.slice(2))
    return true
  }
  if (isPublicComment(line)) {
    comment.public.push(line.slice(3))
    return true
  }
  return false
}
const parseRestColums = (rest: string[]) => {
  const mixed = rest.join(' ').trim()
  if (mixed.length < 1) {
    return { scalarTypeAndModifier: '', attributesAndInlineComment: '' }
  }
  if (mixed[0] == '@' || mixed[0] == '/') {
    return { scalarTypeAndModifier: '', attributesAndInlineComment: mixed }
  }
  const [scalarTypeAndModifier, ...tails] = mixed.split(' ')
  return { scalarTypeAndModifier, attributesAndInlineComment: tails.join(' ') }
}
const collectBockProps = (comment: CommentType, line: string): PropAST =>
  pipe(
    line.split(' '),
    filter(col => col.length > 0),
    ([name, ...rest]) => {
      const { scalarTypeAndModifier, attributesAndInlineComment } =
        parseRestColums(rest)
      const typeInfo = separeScalarType(scalarTypeAndModifier)
      const endIndex = attributesAndInlineComment.indexOf('/')
      let attr = attributesAndInlineComment
      if (endIndex > -1) {
        attr = attr.slice(0, endIndex)
        const inlineComment = attributesAndInlineComment.slice(endIndex)
        assignComment(comment, inlineComment)
      }
      const attribute = attrCol2obj(attr)
      return { name, ...typeInfo, attribute, comment }
    },
  )

const walkLinesWithComment = <R>(
  lines: string[],
  handler: (comment: CommentType, line: string) => R,
) => {
  let comment = makeDefaultComment()
  const len = lines.length
  const results: R[] = []
  for (let i = 0; i < len; i++) {
    const line = lines[i]
    if (assignComment(comment, line)) {
      continue
    }
    results.push(handler(comment, line))
    comment = makeDefaultComment()
  }
  return results
}

const toBlockAST = (lines: string[]): BlockAST => {
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
  const [blockHead] = walkLinesWithComment(headLines, collectBlockHeadInfo)
  const props = walkLinesWithComment(propsLines, collectBockProps)
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

const parseSchame = asyncFlow(readSchema, separeBlock, map(toBlockAST))

const extraModelNames = asyncFlow(readSchema, collectBlockNames(/^(model)/))

export { parseSchame, extraModelNames }
export type { BlockAST, PropAST }

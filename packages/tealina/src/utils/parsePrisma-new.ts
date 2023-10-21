import {
  filter,
  flow,
  groupBy,
  isEmpty,
  isZero,
  map,
  pipe,
  toList,
} from 'fp-lite'
import { readFile } from 'fs/promises'

const notNull = <T>(x: T): x is NonNullable<T> => x != null

export interface BlockRange {
  begin: number
  end: number
}

/**
 * spepare line in to 3 column,and merge above comment
 */
export interface LineInfo {
  fisrtCol: string
  /** when block is model or type,value is type,eg:String,Date,\
   * when block is enum, value is empty string or @map('x') definetion
   */
  secondCol: string
  restCol: string[]
  /** the comment collect from above the line */
  lineComment: string[]
}

export const toFindable = (
  schema: string[],
  partten: RegExp = /\W/,
): {
  findBlocks: (keyword: string) => BlockRange[]
  takeBlockName: ({ begin }: BlockRange) => string
} => {
  const blockRanges = schema
    .map((v, i) => (partten.test(v) ? i : -1))
    .filter(v => v >= 0)
    .map(begin => ({ begin, end: schema.indexOf('}', begin) + 1 }))
  const findBlocks = (keyword: string) =>
    blockRanges.filter(({ begin }) => schema[begin].startsWith(keyword))
  const takeBlockName = ({ begin }: BlockRange) =>
    schema[begin]
      .split(' ')
      .map(p => p.trim())
      .at(1)!
  return { findBlocks, takeBlockName }
}

export const getBlockComment = (schema: string[], { begin }: BlockRange) => {
  let pre = begin - 1
  const comments = []
  while ((schema[pre] ?? '').startsWith('///')) {
    comments.unshift(schema[pre])
    pre--
  }
  if (comments.length <= 0) return []
  return comments.filter(notNull).map(v => v.slice(3))
}

export const parseSchema = (shemaFilePath: string) =>
  readFile(shemaFilePath).then(v => v.toString('utf-8').split('\n'))

/**
 * return a line parser function
 * @param commentLines scope variable,do not pass value to it
 */
export const makeLineParser =
  (commentLines: string[] = []) =>
  (line: string): LineInfo | null => {
    if (line.startsWith('/')) {
      if (line.startsWith('///')) {
        commentLines.push(line.slice(3))
      }
      return null
    }
    const [fisrtCol, secondCol = '', ...restCol] = line
      .split(' ')
      .map(v => v.trim())
      .filter(v => v.length)
    const lineComment = commentLines
    commentLines = []
    return {
      fisrtCol,
      secondCol,
      restCol,
      lineComment,
    }
  }

/** remove all non word character */
export const clearSymbol = (x: string) => x.replace(/\W/g, '')

type BlockKeywordType = 'model' | 'type' | 'enum'

const groupAndPick =
  <T, K, V>(getKey: (x: T) => K, getValue: (x: T) => V) =>
  (xs: T[]) => {
    const record = new Map<K, V[]>()
    let i = xs.length
    for (; i > -1; i--) {
      const v = xs[i]
      const key = getKey(v)
      const list = record.get(key)
      list ? list.push(getValue(v)) : record.set(key, [getValue(v)])
    }
    return record
  }

const CommentPattern = /^[/]/
const LeftBreackPattern = /{$/
const isCommentLine = (line: string) => CommentPattern.test(line)
const isEndOfBlock = (line: string) => line == '}'
const isBeginOfBlock = (line: string) => LeftBreackPattern.test(line)
/**
 * collect all Model,Type,Enum names only
 * @param content schema file content
 */
export const collectBlockNames = (
  lines: string[],
  BeginPattern = /^(model)|^(type)|^(enum)/,
): Map<BlockKeywordType, string[]> => {
  const EndPattern = /{$/
  return pipe(
    lines,
    filter(line => EndPattern.test(line)),
    filter(line => !isCommentLine(line)),
    filter(line => BeginPattern.test(line)),
    map(line =>
      pipe(
        line.split(' '),
        filter(col => col.length > 0),
        ([keyword, name]) => ({ keyword, name }),
      ),
    ),
    groupAndPick(
      v => v.keyword as BlockKeywordType,
      v => v.name,
    ),
  )
}

const separeBlock = (lines: string[]) => {
  const len = lines.length
  let step = 0
  const blockList: string[][] = [[]]
  for (let i = 0; i < len; i++) {
    const line = lines[i].trim()
    if (line.length == 0) {
      continue
    }
    const block = blockList[step]
    block.push(line)
    if (isEndOfBlock(line)) {
      step += 1
    }
  }
}

const PrivateCommentPattern = new RegExp('^// ')
const PublicCommentPattern = new RegExp('^/// ')
const isPrivateComment = (line: string) => PrivateCommentPattern.test(line)
const isPublicComment = (line: string) => PublicCommentPattern.test(line)

const collectBlockHeadInfo = (lines: string) => {
  let privateComments: string[] = []
  let publicComments: string[] = []
  let keyword: string = ''
  let blockName: string = ''
  const len = lines.length
  for (let i = 0; i < len; i++) {
    const line = lines[i]
    if (isPrivateComment(line)) {
      privateComments.push(line)
      continue
    }
    if (isPublicComment(line)) {
      publicComments.push()
      continue
    }
    if (isBeginOfBlock(line)) {
      ;[keyword, blockName] = line.split(' ')
      break
    }
  }
  return { privateComments, publicComments, keyword, blockName }
}

const spepareScalarType = (col: string) => {
  if (col.includes('?')) {
    const [scalarType, modifier = '?'] = col.split('?')
    return { scalarType, modifier }
  }
  if (col.includes('[')) {
    const [scalarType, modifier = '[]'] = col.split('[')
    return { scalarType, modifier }
  }
  return { scalarType: col }
}

const parsePropLines = (lines: string[]) => {
  flow(
    (line: string) => line.split(' '),
    map(col => col.trim()),
    filter(col => col.length > 0),
    ([name, scalarTypeAndModifier, attributes]) => {
      const typeInfo = spepareScalarType(scalarTypeAndModifier)
    },
  )
  pipe(
    lines,
    map(line => line.split(' ')),
  )
}

const block2obj = (lines: string[]) => {
  const len = lines.length
  const blockList: string[][] = [[]]

  let props: string[]
  let blockAttribuites: string[]
  let i = 0
  for (; i < len; i++) {
    const line = lines[i]
  }
  for (; i < len; i++) {
    const line = lines[i]
    if (line[0] == '@') {
      i -= 1
      break
    }
  }
  for (; i < len; i++) {}
}

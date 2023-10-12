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

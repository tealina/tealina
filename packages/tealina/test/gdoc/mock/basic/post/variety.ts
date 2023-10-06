import { FuncAPI } from '../../apiUtility.js'
import { Badge, State, User } from '../../models.js'

type UnionKeysRecord = Record<'yoyo' | 'adv', number>
/**
 * payload comment
 */
interface InputBody {
  limitRecord: Record<string, number>
  unionKeysRecord: UnionKeysRecord
  /** yoyo */
  record: Record<string, any>
  tuple: [string, State.Disabled]
  intersaction: { key: string } & Pick<User, 'name'>
  union: Badge.Blue | number
  newEnum: FileAccess
  literalNumber: 1 | 2
  neverType: never
  templ: `${Position}-${Align}`
  parameters: Parameters<FnType>
}

type FnType = (x: string, y: number) => any
type Align = 'center' | 'bottom'
type Position = 'left' | 'right'
enum FileAccess {
  // constant members
  None,
  Read = 1 << 1,
  Write = 1 << 2,
  ReadWrite = Read | Write,
  // computed member
  G = '123'.length,
}

const calcFn = () => {
  return {
    prop: 'a props',
  }
}

/**
 * response comment
 */
interface ResponseType extends ReturnType<typeof calcFn> {}

/**
 * last element
 */
const handler: FuncAPI<InputBody, ResponseType> = () => {}

const preHandler = () => {}

const handlers = [preHandler, handler] as const

export default handlers

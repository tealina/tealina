import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'

interface UserCreateInput {
  recusiveTuple: RecursiveTuple
  deepRecusiveTuple: DeepRecursiveTuple
  recursiveEntity: NestOption
}

type RecursiveTuple = [number, number, RecursiveTuple | []]

type NestOption = {
  label: string
  value: string
  children: NestOption[]
}

type One = { one: string; t: DeepRecursiveTuple }
type Two = { two: string }
type DeepRecursiveTuple = [One, Two]

type ApiType = AuthedHandler<
  {
    body: UserCreateInput
  },
  UserCreateInput
>

/**
 * Recursive tuples and entities, for the document's cycle handling
 */
const handler: ApiType = async (req, res) => {
  res.send(req.body)
}

export default authedApi(handler)

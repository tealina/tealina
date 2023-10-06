import { AuthedHandler } from '../../../../types/handler.js'

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

// let a: RecusiveTuple = [
//   { one: '' },
//   { two: '' },
//   [{ one: '' }, { two: '' }, []],
// ]

type ApiType = AuthedHandler<
  {
    body: UserCreateInput
  },
  UserCreateInput
>

const handler: ApiType = async (req, res) => {
  res.send(req.body)
}

export default handler

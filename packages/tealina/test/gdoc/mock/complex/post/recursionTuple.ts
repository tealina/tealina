import { FuncAPI } from '../../apiUtility.js'

interface Toy {
  name: string
}

interface RussianDolls {
  item: Toy
  next: Box
}

type Box = [Box, Toy, RussianDolls]

type DeepRecursion = [
  {
    name: string
    extra: {
      tag: string
      nest?: DeepRecursion
    }
  },
]

/**
 * recursion tuple
 */
const handler: FuncAPI<DeepRecursion, Box[]> = () => {}

export default handler

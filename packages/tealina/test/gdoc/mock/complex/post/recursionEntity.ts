import { FuncAPI } from '../../apiUtility.js'

interface Option {
  label: string
  value: string
  children: Option[]
}

/**
 * recursion entity
 */
const handler: FuncAPI<{}, Option[]> = () => {}

export default handler

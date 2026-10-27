import type { EmptyObj, OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import type { Pure } from 'core/pure'
import { listCategories } from 'core/services'

type ApiType = OpenHandler<EmptyObj, Pure.Category[]>

/**
 * The categories the storefront filters by, in the order the shop arranges them.
 */
const handler: ApiType = async (_req, res) => {
  res.send(listCategories())
}

export default openApi(handler)

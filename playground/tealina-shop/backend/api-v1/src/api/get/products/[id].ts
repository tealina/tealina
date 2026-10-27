import type { OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { getProduct, type ProductView } from 'core/services'

type ApiType = OpenHandler<{ params: { id: string } }, ProductView>

/**
 * One product, joined with its category name and review summary.
 */
const handler: ApiType = async (req, res) => {
  res.send(getProduct(req.params.id))
}

export default openApi(handler)

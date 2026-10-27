import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { Pure } from 'core/pure'
import { updateProduct, type ProductView } from 'core/services'

type ApiType = AuthedHandler<
  { params: { id: string }; body: Pure.ProductUpdateInput },
  ProductView
>

/**
 * Edit a product. Every field is optional; only the ones present in the body move.
 */
const handler: ApiType = async (req, res) => {
  res.send(updateProduct(res.locals, req.params.id, req.body))
}

export default authedApi(handler)

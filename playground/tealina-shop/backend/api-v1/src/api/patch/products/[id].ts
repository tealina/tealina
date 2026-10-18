import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { Pure } from '../../../../types/pure.js'
import type { ProductView } from '../../../model.js'
import { parseId, requireAdmin } from '../../../http.js'
import { updateProduct } from '../../../store/index.js'

type ApiType = AuthedHandler<
  { params: { id: string }; body: Pure.ProductUpdateInput },
  ProductView
>

/**
 * Edit a product. Every field is optional; only the ones present in the body move.
 */
const handler: ApiType = async (req, res) => {
  requireAdmin(res.locals.role)
  res.send(updateProduct(parseId(req.params.id), req.body))
}

export default authedApi(handler)

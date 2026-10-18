import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { WithStatusCodeOnly } from 'tealina/utility-types'
import { parseId, requireAdmin } from '../../../http.js'
import { deleteProduct } from '../../../store/index.js'

type ApiType = AuthedHandler<
  { params: { id: string } },
  WithStatusCodeOnly<204>
>

/**
 * Remove a product that has never been ordered. Admin only; answers 204 with no body.
 */
const handler: ApiType = async (req, res) => {
  requireAdmin(res.locals.role)
  deleteProduct(parseId(req.params.id))
  res.status(204).end()
}

export default authedApi(handler)

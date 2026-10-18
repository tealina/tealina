import type { OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import type { ProductView } from '../../../model.js'
import { parseId } from '../../../http.js'
import { getProduct } from '../../../store/index.js'

type ApiType = OpenHandler<{ params: { id: string } }, ProductView>

/**
 * One product, joined with its category name and review summary.
 */
const handler: ApiType = async (req, res) => {
  res.send(getProduct(parseId(req.params.id)))
}

export default openApi(handler)

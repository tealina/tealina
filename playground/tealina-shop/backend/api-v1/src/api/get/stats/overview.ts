import type { EmptyObj, AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { StatsOverview } from '../../../model.js'
import { requireAdmin } from '../../../http.js'
import { getStats } from '../../../store/index.js'

type ApiType = AuthedHandler<EmptyObj, StatsOverview>

/**
 * The admin dashboard in one call: revenue, counts, low stock and the latest orders.
 */
const handler: ApiType = async (_req, res) => {
  requireAdmin(res.locals.role)
  res.send(getStats())
}

export default authedApi(handler)

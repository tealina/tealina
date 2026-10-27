import type { EmptyObj, AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import { getStats, type StatsOverview } from 'core/services'

type ApiType = AuthedHandler<EmptyObj, StatsOverview>

/**
 * The admin dashboard in one call: revenue, counts, low stock and the latest orders.
 */
const handler: ApiType = async (_req, res) => {
  res.send(getStats(res.locals))
}

export default authedApi(handler)

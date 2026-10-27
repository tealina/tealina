import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'

interface CheckAhead {
  date: Date
  type: 'before'
}

interface CheckInTime {
  date: Date
  type: 'inTime'
}

type ApiType = AuthedHandler<
  {
    body: CheckAhead | CheckInTime[]
  },
  CheckAhead | CheckInTime[]
>

/**
 * Echo a union payload back, to exercise union and tuple rendering
 */
const handler: ApiType = async (req, res) => {
  res.send(req.body)
}

export default authedApi(handler)

import { AuthedHandler } from '../../../../types/handler.js'

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
 * test tuple type's initialvalue while switching
 */
const handler: ApiType = async (req, res) => {
  res.send(req.body)
}

export default handler

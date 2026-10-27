import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { Pure } from 'core/pure'
import { exportOrdersCsv } from 'core/services'
import type { MultiTarget, WithHeaders } from 'tealina/utility-types'

export interface OrderExportQuery {
  /** Export only one state; omit for every order. */
  status?: Pure.OrderStatus
}

type ApiType = AuthedHandler<
  { query: OrderExportQuery },
  MultiTarget<{
    server: void
    client: Blob
    doc: WithHeaders<
      {
        'Content-Type': 'text/csv; charset=utf-8'
        'Content-Disposition': string
      },
      string
    >
  }>
>

/**
 * Download every order as CSV. Admin only.
 *
 * The response is a file, not JSON: `Content-Disposition` names it for the browser and
 * the document page shows it in the playground.
 */
const handler: ApiType = async (req, res) => {
  const { filename, csv } = exportOrdersCsv(res.locals, req.query.status)
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  })
  res.end(csv)
}

export default authedApi(handler)

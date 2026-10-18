import type { EmptyObj, OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { setTimeout } from 'node:timers/promises'
import type { MultiTarget, WithHeaders } from 'tealina/utility-types'
import type { ActivityEvent } from '../../../model.js'
import { latestActivityId, listActivity } from '../../../store/index.js'

type ApiType = OpenHandler<
  EmptyObj,
  MultiTarget<{
    /** The handler owns the socket; there is no response value to project. */
    server: void
    client: AsyncGenerator<ActivityEvent>
    doc: WithHeaders<
      {
        'Content-Type': 'text/event-stream'
        'Cache-Control': 'no-cache'
        Connection: 'keep-alive'
      },
      ActivityEvent
    >
  }>
>

/**
 * A live feed of shop activity: new orders, stock changes and reviews.
 *
 * The stream replays the last few events, then polls the store every 1.5 seconds and
 * closes itself after eight events. Place an order in the storefront with this open in
 * the documentation playground and the event appears here.
 */
const handler: ApiType = async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.write('retry: 1500\n\n')

  let disconnected = false
  req.on('close', () => {
    disconnected = true
  })

  let lastId = Math.max(0, latestActivityId() - 3)
  let sent = 0
  while (!disconnected && sent < 8) {
    for (const event of listActivity(lastId)) {
      res.write(`id: ${event.id}\n`)
      res.write(`event: ${event.type}\n`)
      res.write(`data: ${JSON.stringify(event)}\n\n`)
      lastId = event.id
      sent += 1
      if (sent >= 8) break
    }
    if (sent < 8) await setTimeout(1500)
  }

  if (!disconnected) {
    res.write(
      'event: close\ndata: {"message":"Stream finished. Reload to replay it."}\n\n',
    )
    res.end()
  }
}

export default openApi(handler)

import type { EmptyObj, OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { streamActivity, type ActivityEvent } from 'core/services'
import type { MultiTarget, WithHeaders } from 'tealina/utility-types'

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

  const controller = new AbortController()
  req.on('close', () => controller.abort())
  await streamActivity({
    signal: controller.signal,
    write: chunk => res.write(chunk),
  })
  if (!controller.signal.aborted) res.end()
}

export default openApi(handler)

import type { EmptyObj, OpenHandler } from '../../../../types/handler.js'

type ApiType = OpenHandler<EmptyObj, {}>

const handler: ApiType = async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  // Send initial message
  res.write('data: SSE connection established\n\n')
  res.write('event: welcome\n')
  res.write('data: Welcome to the SSE stream\n\n')

  let eventId = 1
  let connectionActive = true

  // Send events periodically
  const interval = setInterval(() => {
    if (!connectionActive) {
      clearInterval(interval)
      return
    }

    const eventData = {
      id: eventId,
      timestamp: new Date().toISOString(),
      message: `Server event ${eventId}`,
      data: Math.random(),
      type: eventId % 2 === 0 ? 'even' : 'odd',
    }

    res.write(`id: ${eventData.id}\n`)
    res.write(`event: ${eventData.type}\n`)
    res.write(`data: ${JSON.stringify(eventData)}\n\n`)

    console.log('SSE event sent:', eventData.message)

    eventId++

    // Auto-close after 10 events
    if (eventId > 10) {
      clearInterval(interval)
      res.write('event: close\n')
      res.write('data: Event stream completed\n\n')
      res.end()
    }
  }, 2000)

  // Handle client disconnect
  req.on('close', () => {
    connectionActive = false
    clearInterval(interval)
    console.log('SSE connection closed by client')
  })
}

export default handler

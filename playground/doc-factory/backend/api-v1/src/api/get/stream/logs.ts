import type { EmptyObj, OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { setTimeout } from 'node:timers/promises'

type ApiType = OpenHandler<EmptyObj, {}>

/**
 * Write a log line every second, as plain text
 */
const handler: ApiType = async (_req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
  })
  const messages = [
    'INFO: Application started successfully',
    'DEBUG: Database connection established',
    'INFO: User session created',
    'WARN: High memory usage detected',
    'INFO: Cache initialized',
    'DEBUG: API request received',
    'INFO: Data processing started',
    'ERROR: External service timeout',
    'INFO: Fallback mechanism activated',
    'INFO: Process completed',
  ]
  for (const msg of messages) {
    await setTimeout(1000)
    res.write(msg + '\n')
  }
  res.end('\nStreaming completed!')
}

export default openApi(handler)

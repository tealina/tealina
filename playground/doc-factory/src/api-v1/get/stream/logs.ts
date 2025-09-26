import { setTimeout } from 'node:timers/promises'
import type { EmptyObj, OpenHandler } from '../../../../types/handler.js'

type ApiType = OpenHandler<EmptyObj, {}>

const handler: ApiType = async (req, res) => {
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
  console.log('Streaming started')
  for (const msg of messages) {
    await setTimeout(1000)
    res.write(msg + '\n')
  }
  res.end('\nStreaming completed!')
  console.log('Streaming finished')
}

export default handler

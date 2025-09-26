import { Transform } from 'node:stream'
import type { OpenHandler } from '../../../../types/handler.js'

type ApiType = OpenHandler<{ query: { lines: string } }, {}>

const handler: ApiType = async (req, res) => {
  const fileName = 'generated-data.txt'
  const totalLines = parseInt(req.query.lines) ?? 100
  const chunkSize = Math.min(10, totalLines) // lines per chunk

  console.log(`Generating ${totalLines} lines for download: ${fileName}`)

  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Transfer-Encoding': 'chunked',
  })

  let linesSent = 0
  let startTime = Date.now()

  // Create a transform stream to generate data
  const dataGenerator = new Transform({
    transform(chunk, encoding, callback) {
      // This will be called by our manual writes
      callback(null, chunk)
    },
  })

  // Function to generate and send data chunks
  const sendChunk = () => {
    const linesInThisChunk = Math.min(chunkSize, totalLines - linesSent)
    let chunkData = ''

    for (let i = 0; i < linesInThisChunk; i++) {
      const lineNumber = linesSent + i + 1
      chunkData += `Line ${lineNumber}: This is dynamically generated content for streaming demonstration. Timestamp: ${new Date().toISOString()}\n`
    }

    dataGenerator.write(chunkData)
    linesSent += linesInThisChunk

    // Progress reporting
    if (linesSent % 1000 === 0 || linesSent === totalLines) {
      const progress = ((linesSent / totalLines) * 100).toFixed(1)
      const elapsed = (Date.now() - startTime) / 1000
      const speed = (linesSent / elapsed).toFixed(0)
      if (progress == '100.0') {
        dataGenerator.end()
        console.log('eeeeend')
      }
      console.log(
        `Progress: ${progress}% (${linesSent}/${totalLines}) - ${speed} lines/sec`,
      )
    }

    // Use setImmediate to avoid blocking the event loop
    if (linesSent < totalLines) {
      setImmediate(sendChunk)
    }
  }

  // Handle stream completion
  dataGenerator.on('end', () => {
    const totalTime = (Date.now() - startTime) / 1000
    console.log(
      `File generation completed: ${totalLines} lines in ${totalTime.toFixed(2)} seconds`,
    )
    res.end()
  })

  // Pipe the generator to response
  dataGenerator.pipe(res)

  // Start generating data
  sendChunk()
}

export default handler

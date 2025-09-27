import { Transform } from 'node:stream'
import type { OpenHandler } from '../../../../types/handler.js'
import { setTimeout } from 'node:timers/promises'

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

  // Create a transform stream to generate data
  const dataGenerator = new Transform({
    transform(chunk, encoding, callback) {
      // This will be called by our manual writes
      callback(null, chunk)
    },
  })
  dataGenerator.pipe(res)
  const totalPage = Math.ceil(totalLines / chunkSize)
  const pageSummaries = Array(totalPage)
    .fill(chunkSize)
    .map((_, i) => {
      const begin = i * chunkSize
      const end = Math.min(totalLines, begin + chunkSize)
      return { begin, end }
    })
  for (const { begin, end } of pageSummaries) {
    await setTimeout(1000)
    const chunkData = Array(end - begin)
      .fill(begin)
      .map(
        (begin, i) =>
          `Line ${begin + i}: This is dynamically generated content for streaming demonstration.\n`,
      )
    dataGenerator.write(chunkData)
  }
  dataGenerator.end()
}

export default handler

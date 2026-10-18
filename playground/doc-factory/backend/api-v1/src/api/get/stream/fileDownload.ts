import type { OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { setTimeout } from 'node:timers/promises'
import { Transform } from 'node:stream'

type ApiType = OpenHandler<{ query: { lines: string } }, {}>

/**
 * Generate a text file on the fly, a chunk per second
 */
const handler: ApiType = async (req, res) => {
  const fileName = 'generated-data.txt'
  const totalLines = Number(req.query.lines) || 100
  const chunkSize = Math.min(10, totalLines)

  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Transfer-Encoding': 'chunked',
  })

  const dataGenerator = new Transform({
    transform(chunk, _encoding, callback) {
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
        (lineStart, i) =>
          `Line ${lineStart + i}: This is dynamically generated content for streaming demonstration.\n`,
      )
    dataGenerator.write(chunkData.join(''))
  }
  dataGenerator.end()
}

export default openApi(handler)

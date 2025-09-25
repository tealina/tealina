const kDownloadPattern = /application\/.*download/
const kMediaTypePattern = /^(image|video|audio)/
const kJSON_Type = /json/
const kDisposition = 'content-disposition'
const kSimpleJSON = 'application/json'
const kStreamTypes = [
  'text/event-stream',
  'application/x-ndjson',
  'application/octet-stream',
  'application/jsonl',
]
const kPDF_Type = 'application/pdf'
const kZipType = 'application/zip'
const kBinaryTypes = ['application/octet-stream', kZipType, kPDF_Type]

type Res<T> = {
  status: number
  contentType?: string
} & T

export async function smartFetch(
  url: string,
  options = {},
): Promise<
  | Res<{ type: 'error'; msg: string }>
  | Res<{ type: 'binary'; blob: Blob; filename: string }>
  | Res<{ type: 'stream' | 'json-stream'; portion: AsyncGenerator<string> }>
  | Res<{ type: 'text' | 'json'; text: string }>
> {
  const response = await fetch(url, options)
  const contentType = response.headers.get('content-type') || ''

  const { status } = response
  if (!response.ok) {
    const msg = await response.text()
    return {
      status,
      contentType,
      type: 'error',
      msg: msg ?? response.statusText,
    }
  }
  if (contentType === kSimpleJSON) {
    const text = await response.text()
    return {
      status,
      contentType,
      type: 'json',
      text,
    }
  }
  if (isStream(contentType)) {
    return {
      status,
      contentType,
      type: isSorfOfJSON(contentType) ? 'json-stream' : 'stream',
      portion: createTextStream(response),
    }
  }
  if (isAttachment(response.headers) || isBinary(contentType)) {
    const blob = await response.blob()
    const contentDisposition = response.headers.get(kDisposition)!
    const filename = getFilenameFromHeaders(contentType, contentDisposition)
    return {
      status,
      contentType,
      type: 'binary',
      blob,
      filename,
    }
  }
  const text = await response.text()
  return {
    status,
    contentType,
    type: isSorfOfJSON(contentType) ? 'json' : 'text',
    text,
  }
}

function getFilenameFromHeaders(
  contentType: string,
  contentDisposition: string,
) {
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/)
    if (filenameMatch) {
      return filenameMatch[1]
    }
  }
  if (isSuffixInferential(contentType)) {
    const [, suffix] = contentType.split('/')
    return `__NoName__.${suffix}`
  }
  return '__No_oNname__'
}

async function* createTextStream(response: Response) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      yield chunk
    }
  } finally {
    reader.releaseLock()
  }
}

export function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function isBinary(contentType: string) {
  return (
    kBinaryTypes.some(c => contentType.includes(c)) ||
    kDownloadPattern.test(contentType) ||
    kMediaTypePattern.test(contentType)
  )
}

function isStream(contentType: string) {
  return kStreamTypes.some(c => contentType.includes(c))
}

function isSorfOfJSON(contentType: string) {
  return kJSON_Type.test(contentType)
}

function isSuffixInferential(contentType: string) {
  return (
    kMediaTypePattern.test(contentType) ||
    [kPDF_Type, kZipType].includes(contentType)
  )
}

function isAttachment(headers: Response['headers']) {
  const disposition = headers.get(kDisposition)
  if (disposition == null) return false
  return (
    disposition.startsWith('attachment') || disposition.includes('filename=')
  )
}

import { useForm } from 'antd/es/form/Form'
import type { AxiosError, AxiosResponse } from 'axios'
import { pipe } from 'fp-lite'
import { useAtomValue } from 'jotai/react'
import { type DocItem, DocKind, type DocNode } from '@tealina/doc-types'
import { curJsonSourceAtom } from '../../../atoms/jsonSourceAtom'
import { req } from '../../../utils/request'
import { useCacheStates } from './useCache'

const mayNotJSON = (responseType?: DocNode) => {
  if (responseType == null) return
  if (
    responseType.kind === DocKind.NonLiteralObject &&
    (responseType.type === 'Blob' || responseType.type === 'File')
  ) {
    return 'blob'
  }
  if (responseType.jsDoc?.content_type === 'octet-steam') return 'blob'
}

/**
 *  when path has multiple params\
 *  ensure longer one at first\
 *  for avoid misplaced\
 *  eg: /api/:id/:idOther,
 *  return  [['idOther',1], ['id','xx']]
 */
const descendByKeyLength = (kvs: [string, any][]): [string, any][] =>
  kvs.sort((a, b) => b[0].length - a[0].length)

const replaceURL = (url: string) => (sortedKeyValues: [string, any][]) => {
  const getMatch = url.includes(':')
    ? (k: string) => `:${k}`
    : (k: string) => `{${k}}`
  return sortedKeyValues.reduce(
    (acc, [k, v]) => acc.replace(getMatch(k), v as string),
    url,
  )
}

const saveFile = (response: AxiosResponse) => {
  const filename = getFilenameFrom(response)
  const blob = response.data as Blob
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(href)
}

const toActualURL = (params: Record<string, any> | undefined, url: string) =>
  params == null
    ? url
    : pipe(Object.entries(params), descendByKeyLength, replaceURL(url))

const getFilenameFrom = (response: AxiosResponse) => {
  const dispotion: string = response.headers['content-disposition'] ?? ''
  const kvs = dispotion
    .split(',')
    .map(part => part.split('='))
    .map(arr => (arr.length < 2 ? [arr[0], ''] : arr))
  const obj = Object.fromEntries(kvs)
  return obj?.filename ?? 'file_with_no_name'
}

const findReason = (err: AxiosError) => {
  const { response } = err
  if (response?.data == null) return err.toJSON()
  const { data } = response
  if (typeof data !== 'object') return data
  const { errorMessageKey } = window.TEALINA_VDOC_CONFIG
  if (errorMessageKey == null) return data
  const record = data as Record<string, any>
  if (record[errorMessageKey] == null) return data
  return String(record[errorMessageKey])
}

export function useSumit({
  cacheKey,
  method,
  path,
  docItem,
}: {
  cacheKey: string
  method: string
  path: string
  docItem: DocItem
}) {
  const [form] = useForm()
  const { cacheFormValue, states, setStates } = useCacheStates({
    cacheKey,
    form,
  })
  const source = useAtomValue(curJsonSourceAtom)
  const showResult = (response: AxiosResponse) => {
    const isError = false
    const statusCode = response.status
    if (response.headers['content-disposition']) {
      setStates({ isError, statusCode, code: '' })
      return saveFile(response)
    }
    const code = JSON.stringify(response.data, null, 2)
    setStates({ isError, statusCode, code })
  }
  const showError = (err: AxiosError) => {
    const statusCode = err.response ? err.response.status : err.status
    const data = findReason(err)
    setStates({
      statusCode,
      code: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      isError: true,
    })
  }
  const handleSubmit = async (payload: any) => {
    cacheFormValue(payload)
    const { headers, query, params, body } = payload
    const { response: responseType } = docItem
    const url = [
      source.baseURL.replace(/\/$/, ''),
      path.replace(/^\//, ''),
    ].join('/')

    const { customRequests = [] } = window.TEALINA_VDOC_CONFIG
    if (customRequests.length > 0) {
      const config = {
        method,
        url: toActualURL(params, url),
        headers,
        responseType: mayNotJSON(responseType),
        params: query,
        body,
      }
      const item = customRequests.find(item => item.match(config))
      if (item) {
        return item.handler(config, setStates).catch(showError)
      }
    }
    return req
      .request({
        method,
        url: toActualURL(params, url),
        headers,
        responseType: mayNotJSON(responseType),
        params: query,
        data: body,
      })
      .then(showResult)
      .catch(showError)
  }

  return { states, form, handleSubmit }
}

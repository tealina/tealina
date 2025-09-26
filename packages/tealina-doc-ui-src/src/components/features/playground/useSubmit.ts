import { VariousResponseType } from '@tealina/doc-ui'
import { useForm } from 'antd/es/form/Form'
import { pipe } from 'fp-lite'
import { useAtomValue } from 'jotai/react'
import { curJsonSourceAtom } from '../../../atoms/jsonSourceAtom'
import { saveFile, smartFetch } from './smartFetch'
import { useCacheStates } from './useCache'
import { useState } from 'react'

/**
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

const toActualURL = (
  url: string,
  params: Record<string, any> | undefined,
  query = {},
) => {
  const injectParams =
    params == null
      ? url
      : pipe(Object.entries(params), descendByKeyLength, replaceURL(url))
  const queryStr = new URLSearchParams(query).toString()
  return [injectParams, queryStr].filter(v => v.length > 0).join('?')
}

export function useSumit({
  cacheKey,
  method,
  path,
}: {
  cacheKey: string
  method: string
  path: string
}) {
  const [form] = useForm()
  const { cacheFormValue, states, setStates } = useCacheStates({
    cacheKey,
    form,
  })
  const source = useAtomValue(curJsonSourceAtom)
  const [preview, setPreview] = useState('')
  async function getPreviewContent(res: VariousResponseType) {
    setStates(res)
    switch (res.type) {
      case 'binary': {
        saveFile(res.result)
        return
      }
      case 'stream':
      case 'json-stream': {
        for await (const chunk of res.result) {
          setPreview(pre => [pre, chunk].join(''))
        }
        return
      }
      default: {
        setPreview(res.result)
      }
    }
  }
  const handleSubmit = async (payload: any) => {
    setPreview('')
    cacheFormValue(payload)
    const { headers, query, params, body } = payload
    const url = [
      source.baseURL.replace(/\/$/, ''),
      path.replace(/^\//, ''),
    ].join('/')

    const { customRequests = [] } = window.TEALINA_VDOC_CONFIG
    if (customRequests.length > 0) {
      const config = {
        method,
        url: toActualURL(url, params, query),
        headers,
        query,
        body,
      }
      const item = customRequests.find(item => item.match(config))
      if (item) {
        return item.handler(config).then(getPreviewContent)
      }
    }
    await smartFetch(toActualURL(url, params, query), {
      method,
      headers,
      body: JSON.stringify(body),
    }).then(getPreviewContent, (e): VariousResponseType => {
      console.error(e)
      return {
        status: -1,
        type: 'error',
        result: `Client Side Error:\n ${String(e)}`,
        contentType: 'text/plain',
      }
    })
  }

  return { states, form, handleSubmit, preview }
}

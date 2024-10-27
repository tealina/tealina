import { atom } from 'jotai'
import type { ApiDoc } from '@tealina/doc-types'
import type { TealinaVdocWebConfig } from '@tealina/doc-ui'

if (import.meta.env.MODE === 'development') {
  window.TEALINA_VDOC_CONFIG = {
    sources: [
      {
        baseURL: '/api/v1',
        jsonURL: '/api-doc/v1.json',
        name: '/api/v1',
      },
    ],
    errorMessageKey: 'message',
    features: {
      playground: {
        commonFields: {
          headers: {
            Authorization: 'string',
          },
          body: {
            skip: { type: 'number', default: 0 },
            take: { type: 'number', default: 10 },
          },
        },
      },
    },
  }
}

const sources = window.TEALINA_VDOC_CONFIG.sources
/** Users may come from sharing links */
const paramsFromURL = new window.URLSearchParams(window.location.search)

const getInitialSource = (sources: TealinaVdocWebConfig['sources']) => {
  const jsonURL = paramsFromURL.get('source')
  const target = sources.find(v => v.jsonURL === jsonURL)
  return target ?? sources[0]
}

const getDefaultShowApi = (): CurApi | null => {
  const path = paramsFromURL.get('path')
  const method = paramsFromURL.get('method')
  if (path == null || method == null) return null
  return {
    path,
    method,
  }
}

export interface CurApi {
  method: string
  path: string
}

export const commonFieldsAtom = atom(
  window?.TEALINA_VDOC_CONFIG?.features?.playground?.commonFields,
)

export const commonInitialValueAtom = atom<
  Record<string, Record<string, unknown>>
>({})

export const jsonSourceAtom = atom(sources)

export const curJsonSourceAtom = atom(getInitialSource(sources))

export const curShowApiAtom = atom<CurApi | null>(getDefaultShowApi())

export const apiDocAtom = atom<Promise<ApiDoc>>(async get => {
  const curSource = get(curJsonSourceAtom)
  if (curSource == null) {
    console.error('API JSON url not set')
    return { apis: {}, enumRefs: {}, entityRefs: {}, tupleRefs: {} } as ApiDoc
  }
  const doc = await fetch(curSource.jsonURL).then(
    r => r.json() as Promise<ApiDoc>,
  )
  return doc
})

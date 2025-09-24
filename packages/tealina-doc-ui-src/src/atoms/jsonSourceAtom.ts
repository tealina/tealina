import type { ApiDoc } from '@tealina/doc-types'
import type { TealinaVdocWebConfig } from '@tealina/doc-ui'
import { atom } from 'jotai'
import type { OpenAPIV3_1 } from 'openapi-types'
import { openApi2apiDoc } from '../transformer/openapi2apiDoc'

let kHeadersForAuth = {}
export function setHeadersForAuth(headers: Record<string, any>) {
  kHeadersForAuth = headers
}

function deepFreeze(obj: any) {
  Object.freeze(obj)
  for (const prop of Object.getOwnPropertyNames(obj)) {
    const value = obj[prop]
    if (typeof value === 'function') {
      Object.defineProperties(value, {
        name: { writable: false },
        length: { writable: false },
        prototype: { writable: false },
      })
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        deepFreeze(v)
      }
    }
    if (
      typeof value === 'object' &&
      value !== null &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value)
    }
  }
  return obj
}

const config = window.TEALINA_VDOC_CONFIG
//Assign custom requests that can be pre-injected by users.
config.customRequests = window.TEALINA_VDOC_CUSTOM_REQUESTS
window.TEALINA_VDOC_CONFIG = deepFreeze(config)

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
  const result = await fetch(curSource.jsonURL, { headers: kHeadersForAuth })
  if (result.status != 200) {
    const msg = await result.text().then(
      x => x ?? result.statusText,
      () => result.statusText,
    )
    throw new Error(msg)
  }
  const doc: ApiDoc | OpenAPIV3_1.Document = await result.json()
  if ('openapi' in doc) {
    return openApi2apiDoc(doc, curSource.baseURL)
  }
  return doc
})

import type { ApiDoc, DocItem } from '@tealina/doc-types'
import { flat, flow, map, pipe } from 'fp-lite'
import { atom } from 'jotai'
import { apiDocAtom } from './jsonSourceAtom'
export interface ApiSummary {
  endpoint: string
  label: string
  method: string
  module: string
}

const toItemModel = ([method, docItem]: [
  string,
  Record<string, DocItem>,
]): ApiSummary[] =>
  Object.keys(docItem).map(endpoint => {
    const parts = endpoint.split('/')
    const isRoot = parts.length <= 2
    const isTail = parts[0] === ''
    const index = isTail ? 1 : 0
    const module = isRoot ? '/' : isTail ? parts[1] : parts[0]
    const rest =
      module === parts[index] ? ['', ...parts.slice(index + 1)] : parts
    return {
      endpoint,
      label: rest.join('/'),
      method,
      module,
    }
  })

export const apiSummariesAtom = atom(async get => {
  const doc = await get(apiDocAtom)
  const summaries = pipe(Object.entries(doc.apis), map(toItemModel), flat, xs =>
    xs.sort((a, b) => a.module.localeCompare(b.module)),
  )
  return summaries
})

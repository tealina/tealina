import type { ApiDoc, DocItem } from '@tealina/doc-types'
import { useAtomValue } from 'jotai'
import {
  apiDocAtom,
  curJsonSourceAtom,
  curShowApiAtom,
} from '../../atoms/jsonSourceAtom'
import { DetailContent } from './DetailContent'

export interface OneApiDoc {
  doc: ApiDoc
  docItem: DocItem
  identity: {
    method: string
    path: string
    source: string
  }
}

function useDocItem(): OneApiDoc | null {
  const doc = useAtomValue(apiDocAtom)
  const curShowApi = useAtomValue(curShowApiAtom)
  const source = useAtomValue(curJsonSourceAtom)
  if (curShowApi == null) return null
  const { method, path } = curShowApi
  const docItem = doc.apis[method][path]
  const identity = { method, path, source: source.jsonURL }
  return { doc, docItem, identity }
}

function ApiDetail() {
  const info = useDocItem()
  if (info == null) return null
  return <DetailContent {...info} />
}

export { ApiDetail }

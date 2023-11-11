import type {
  ApiDoc,
  DocItem,
  DocNode,
  ObjectType,
  PropType,
} from '@tealina/doc-types'
import { DocKind } from '@tealina/doc-types'
import { SegmentedValue } from 'antd/es/segmented'
import { useEffect, useMemo, useRef, useState } from 'react'
export type PayloadKeys = keyof Pick<
  DocItem,
  'headers' | 'body' | 'response' | 'query' | 'params'
>

export type OneApiScopeEntitie = Pick<
  ApiDoc,
  'enumRefs' | 'entityRefs' | 'tupleRefs'
> & {
  nonLiterals: ObjectType[]
}

/**
 *
 * @returns  {true|undefined} if true, means first one not match
 */
export function getNestEntity(
  d: DocNode,
  doc: ApiDoc,
  inScope: OneApiScopeEntitie,
) {
  switch (d.kind) {
    case DocKind.NonLiteralObject:
      if (inScope.nonLiterals.find(v => v.type == d.type)) {
        break
      }
      inScope.nonLiterals.push(d)
      break
    case DocKind.Array:
      getNestEntity(d.element, doc, inScope)
      break
    case DocKind.EntityRef:
      if (inScope.entityRefs[d.id]) return
      const { entityRefs } = doc
      inScope.entityRefs[d.id] = entityRefs[d.id]
      entityRefs[d.id].props.forEach(v => getNestEntity(v, doc, inScope))
      break
    case DocKind.Union:
      d.types.forEach(v => getNestEntity(v, doc, inScope))
      break
    case DocKind.EnumRef:
      if (inScope.enumRefs[d.id]) return
      inScope.enumRefs[d.id] = doc.enumRefs[d.id]
      break
    case DocKind.Tuple:
      d.elements.forEach(e => getNestEntity(e, doc, inScope))
      break
    case DocKind.RecursionTuple:
      inScope.tupleRefs[d.id] = doc.tupleRefs[d.id]
      break
    default:
      if (d.kind === DocKind.Record) {
        getNestEntity(d.value, doc, inScope)
      }
      return true
  }
}

export const nodeNull: DocNode = { kind: DocKind.Primitive, type: 'null' }

export type SegmentTabKeys = PayloadKeys | 'play'
const kPaloadKeys: PayloadKeys[] = [
  'headers',
  'body',
  'response',
  'query',
  'params',
]

const capitalize = <T extends string>(x: T): Capitalize<T> =>
  [x[0].toUpperCase(), x.slice(1)].join('') as Capitalize<T>

export function genEmptyApiDoc(): OneApiScopeEntitie {
  return {
    entityRefs: {},
    enumRefs: {},
    tupleRefs: {},
    nonLiterals: [],
  }
}

export function toPropType(
  docItem: DocItem,
  memoMap: Map<SegmentTabKeys, OneApiScopeEntitie>,
  doc: ApiDoc,
): (value: SegmentTabKeys) => PropType {
  return k => {
    const key = (k as string).toLowerCase() as PayloadKeys
    const node = docItem[key]!
    if (memoMap.has(key)) return { name: key, ...node }
    const next = genEmptyApiDoc()
    getNestEntity(node, doc, next)
    memoMap.set(key, next)
    return { name: key, ...node }
  }
}

const isPlaygroundEnabled =
  window.TEALINA_VDOC_CONFIG.features?.playground != null

function extraNotNull(docItem: DocItem) {
  return () => {
    return kPaloadKeys.filter(k => docItem[k] != null)
  }
}

const keys2tabOptions = (appearedKeys: PayloadKeys[]) =>
  [...appearedKeys, isPlaygroundEnabled ? ['play'] : []].flat().map(key => ({
    label: capitalize(key),
    value: key,
  }))

export function useDetailState(_doc: ApiDoc, docItem: DocItem) {
  const appearedKeys = useMemo<PayloadKeys[]>(extraNotNull(docItem), [docItem])
  const tabOptions = useMemo(() => keys2tabOptions(appearedKeys), [docItem])
  const [curTab, setCurTab] = useState<SegmentTabKeys>(appearedKeys[0])
  const memoMap = useRef(new Map<PayloadKeys, OneApiScopeEntitie>())
  const handleTabChange = (v: SegmentedValue) => {
    setCurTab(v as SegmentTabKeys)
  }
  useEffect(() => {
    memoMap.current.clear()
    handleTabChange(appearedKeys[0])
  }, [docItem])
  return {
    curTab,
    appearedKeys,
    handleTabChange,
    memoMap: memoMap.current,
    tabOptions,
  }
}

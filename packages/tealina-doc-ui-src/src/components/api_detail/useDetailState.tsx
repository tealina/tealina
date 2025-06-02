import type {
  ApiDoc,
  DocItem,
  DocNode,
  Entity,
  EnumEntity,
  ObjectType,
  PropType,
  TupleEntity,
} from '@tealina/doc-types'
import { DocKind } from '@tealina/doc-types'
import type { SegmentedValue } from 'antd/es/segmented'
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

export type EntityOnlyDoc = Pick<ApiDoc, 'entityRefs' | 'enumRefs' | 'tupleRefs'>
export type MemoedAppearedEntity = Map<string, AppearedEntity[]>
export type AppearedEntity =
  | { belong: 'enum'; id: number, value: EnumEntity }
  | { belong: 'entity'; id: number, value: Entity }
  | { belong: 'tuple'; id: number, value: TupleEntity }
  | { belong: 'nonLiteral'; value: ObjectType }

export const appearedEntity2doc = (entities: AppearedEntity[]): EntityOnlyDoc => {
  const entityRefs = Object.fromEntries(entities.filter(v => v.belong === 'entity').map(v => [v.id, v.value]))
  const enumRefs = Object.fromEntries(entities.filter(v => v.belong === 'enum').map(v => [v.id, v.value]))
  const tupleRefs = Object.fromEntries(entities.filter(v => v.belong === 'tuple').map(v => [v.id, v.value]))
  return { entityRefs, enumRefs, tupleRefs }
}
/**
 *
 * @returns  {true|undefined} if true, means first one not match
 */
export function getNestEntity(
  d: DocNode,
  doc: ApiDoc,
  inScope: AppearedEntity[],
) {
  switch (d.kind) {
    case DocKind.NonLiteralObject: {
      const nonLiterals = inScope.filter(v => v.belong === 'nonLiteral')
      if (nonLiterals.find(v => v.value.type === d.type)) {
        break
      }
      inScope.push({ belong: 'nonLiteral', value: d })
      break
    }
    case DocKind.Array:
      getNestEntity(d.element, doc, inScope)
      break
    case DocKind.EntityRef: {
      const entityRefsRecord = inScope.filter(v => v.belong === 'entity')
      if (entityRefsRecord.find(v => v.id === d.id)) return
      const { entityRefs } = doc
      inScope.push({ belong: 'entity', id: d.id, value: entityRefs[d.id] })
      entityRefs[d.id].props.forEach(v =>
        getNestEntity(v, doc, inScope),
      )
      break
    }
    case DocKind.Union:
      d.types.forEach(v => getNestEntity(v, doc, inScope))
      break
    case DocKind.EnumRef: {
      const enumRefsRecord = inScope.filter(v => v.belong === 'enum')
      if (enumRefsRecord.find(v => v.id === d.id)) return
      inScope.push({ belong: 'enum', id: d.id, value: doc.enumRefs[d.id] })
      break
    }
    case DocKind.Tuple:
      d.elements.forEach(e => getNestEntity(e, doc, inScope))
      break
    case DocKind.RecursionTuple: {
      const tupleRefsRecord = inScope.filter(v => v.belong === 'tuple')
      if (tupleRefsRecord.find(v => v.id === d.id)) return
      inScope.push({ belong: 'tuple', id: d.id, value: doc.tupleRefs[d.id] })
      break
    }
    case DocKind.LiteralObject:
      d.props.forEach(e => getNestEntity(e, doc, inScope))
      break

    // case DocKind.Never: {
    //   const { httpStatusCode } = d.jsDoc ?? {}
    //   if (httpStatusCode != null) {
    //     inScope.push({ belong: "variousHTTPCode", value: { comment: d.comment, statusCode: httpStatusCode } })
    //   }
    //   break
    // }
    default:
      if (d.kind === DocKind.Record) {
        getNestEntity(d.value, doc, inScope)
      }
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
  memoMap: Map<SegmentTabKeys, AppearedEntity[]>,
  doc: ApiDoc,
): (value: SegmentTabKeys) => PropType {
  return k => {
    const key = (k as string).toLowerCase() as PayloadKeys
    const node = docItem[key]!
    if (memoMap.has(key)) return { name: key, ...node }
    const container: AppearedEntity[] = []
    getNestEntity(node, doc, container)
    memoMap.set(key, container)
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

  const memoMap = useRef(new Map<PayloadKeys, AppearedEntity[]>())
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

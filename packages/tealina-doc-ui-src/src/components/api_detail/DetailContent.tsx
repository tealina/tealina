import { CopyOutlined } from '@ant-design/icons'
import {
  DocKind,
  type ApiDoc,
  type DocItem,
  type Entity,
  type ObjectType,
  type TupleEntity,
} from '@tealina/doc-types'
import { Button, Segmented, Spin, Tag } from 'antd'
import { useAtomValue } from 'jotai'
import { Suspense, lazy } from 'react'
import { curJsonSourceAtom } from '../../atoms/jsonSourceAtom'
import { syntaxColorAtom } from '../../atoms/themeAtom'
import { type2cell } from '../../transformer/type2cell'
import { Anchor } from '../Anchor'
import { ColorText } from '../ColorText'
import { EntityTable } from '../EntityTable'
import { EnumTable } from '../EnumTable'
import type { OneApiDoc as OneApiSummary } from './ApiDetail'
import {
  type ApperanceEntiryRecord,
  genEmptyApiDoc,
  getNestEntity,
  nodeNull,
  toPropType,
  useDetailState,
  type OneApiScopeEntitie,
  type PayloadKeys,
  type SegmentTabKeys,
} from './useDetailState'
const Playground = lazy(() => import('../features/playground/Playground'))

function CopyButton({
  identity,
  className,
}: Pick<OneApiSummary, 'identity'> & { className?: string }) {
  const copyShareLink = () => {
    const query = Object.entries(identity)
      .map(kv => kv.join('='))
      .join('&')
    // const params = encodeURIComponent(query)
    const { origin, pathname } = window.location
    const shareLink = `${origin}${pathname}?${query}`
    window.navigator.clipboard.writeText(shareLink)
  }
  return (
    <Button
      type="text"
      className={className}
      title="Copy as share link"
      onClick={copyShareLink}
      icon={<CopyOutlined />}
    />
  )
}

const id2cacheKey = ({ source, method, path }: OneApiSummary['identity']) =>
  [source, method, path].join('_')

export function DetailContent(summary: OneApiSummary) {
  const { doc, docItem, identity } = summary
  const { curTab, tabOptions, appearedKeys, memoMap, handleTabChange } =
    useDetailState(doc, docItem)
  const source = useAtomValue(curJsonSourceAtom)
  return (
    <div className="p-3 h-screen flex flex-col">
      <div className="text-lg flex-shrink-0">
        <div className="group">
          <Tag className="uppercase text-16px px-3 py-1">{identity.method}</Tag>
          <ColorText type="string" className="tracking-wider">
            {[source.baseURL, identity.path].join('')}
          </ColorText>
          <CopyButton
            identity={identity}
            className="invisible group-hover:visible pl-2"
          />
        </div>
        <p className="dark:text-white/75 whitespace-pre-wrap">
          {docItem.comment}
        </p>
      </div>
      <div className="flex-shrink-0">
        <div className="h-8" />
        <Segmented
          options={tabOptions}
          value={curTab}
          onChange={handleTabChange}
        />
        <div className="h-8" />
      </div>
      <div className="flex-grow">
        {curTab === 'play' ? (
          <PlaygroundPanel
            oneApiSummary={summary}
            apperanceKeys={appearedKeys}
            memoMap={new Map([...memoMap.entries()].map(([k, v]) => [k, v.entities]))}
          />
        ) : (
          <PlayloadPanel
            curTab={curTab}
            memoMap={memoMap}
            doc={doc}
            docItem={docItem}
            keyPrefix={[identity.method, identity.path].join('/')}
          />
        )}
      </div>
    </div>
  )
}

function PlayloadPanel({
  curTab,
  memoMap,
  doc,
  docItem,
  keyPrefix
}: {
  memoMap: Map<string, ApperanceEntiryRecord>
  docItem: DocItem
  doc: ApiDoc
  curTab: SegmentTabKeys
  keyPrefix: string
}) {
  const key = curTab as PayloadKeys
  if (!memoMap.has(`${keyPrefix}/${key}`)) {
    const next = genEmptyApiDoc()
    const sortRercord: (keyof OneApiScopeEntitie)[] = []
    const isNonNest = getNestEntity(docItem[key] ?? nodeNull, doc, next, sortRercord)
    if (!isNonNest) {
      memoMap.set(key, { sorts: sortRercord, entities: next })
    }
  }
  const record = memoMap.get(key)
  if (record == null) {
    return type2cell(docItem[key]!, doc)
  }
  const renderEntities = () => {
    const { sorts, entities } = record
    const walkedMap = new Map<string, number>()
    const entityRefs = Object.entries(entities.entityRefs).reverse()
    const enumRefs = Object.entries(entities.enumRefs).reverse()
    const tupleRefs = Object.entries(entities.tupleRefs).reverse()
    const nonLiterals = [...entities.nonLiterals].reverse()
    return sorts.map(k => {
      const i = (walkedMap.get(k) ?? -1) + 1
      walkedMap.set(k, i)
      switch (k) {
        case 'entityRefs': {
          const [id, v] = entityRefs[i]
          return <EntityTable entity={v} key={id} id={id} doc={entities} />
        }
        case 'enumRefs': {
          const [id, v] = enumRefs[i]
          return <EnumTable enumEntity={v} key={id} id={id} />
        }
        case 'nonLiterals': {
          const obj = nonLiterals[i]
          return <NonLiteralEntity key={obj.type} obj={obj} />
        }
        case 'tupleRefs': {
          const [id, v] = tupleRefs[i]
          return <TupleContent obj={v} id={id} key={id} doc={entities} />

        }
      }
    }
    )
  }
  return (
    <div className="flex flex-col gap-3 pb-10">

      {renderEntities()}
    </div>
  )
}

function TupleContent({
  obj,
  doc,
  id,
}: {
  id: string
  obj: TupleEntity
  doc: OneApiScopeEntitie
}) {
  return (
    <div className="text-lg">
      <Anchor id={id}>
        <ColorText>{obj.name}</ColorText>
      </Anchor>
      <div className="mt-4 flex p-2 border-solid rounded border-[#f0f0f0] bg-white dark:border-[#303030] dark:bg-[#141414] ">
        {type2cell({ kind: DocKind.Tuple, elements: obj.elements }, doc)}
      </div>
    </div>
  )
}

function NonLiteralEntity({ obj }: { obj: ObjectType }) {
  return (
    <div className="text-lg">
      <CommentText obj={obj} />
      <div className="text-lg font-bold" id={obj.type}>
        <ColorText>{obj.type}</ColorText>
      </div>
    </div>
  )
}

function CommentText({ obj }: { obj: ObjectType }) {
  const TypeColors = useAtomValue(syntaxColorAtom)
  const kvs = Object.entries(obj.jsDoc ?? {}).map(([k, v]) => (
    <>
      <span key="head"> * </span>
      <ColorText type="const" key="const">{`@${k}`}</ColorText>
      <ColorText type="comment" key="comment">{`  { ${v} }`}</ColorText>
    </>
  ))
  if (kvs.length < 1 && obj.comment == null) return null
  return (
    <div className="whitespace-pre" style={{ color: TypeColors.comment }}>
      <div>/**</div>
      <ColorText type="comment">{obj.comment}</ColorText>
      {...kvs}
      <div> */</div>
    </div>
  )
}

function PlaygroundPanel({
  apperanceKeys,
  memoMap,
  oneApiSummary,
}: {
  oneApiSummary: OneApiSummary
  apperanceKeys: SegmentTabKeys[]
  memoMap: Map<SegmentTabKeys, OneApiScopeEntitie>
}) {
  const { doc, docItem, identity } = oneApiSummary
  const payloadProps = apperanceKeys
    .filter(v => v !== 'play' && v !== 'response')
    .map(toPropType(docItem, memoMap, doc))
  const formEntity: Entity = { name: 'payload', props: payloadProps }
  return (
    <Suspense fallback={<Spin />}>
      <Playground
        doc={doc}
        entity={formEntity}
        method={identity.method}
        path={identity.path}
        docItem={docItem}
        cacheKey={id2cacheKey(identity)}
      />
    </Suspense>
  )
}

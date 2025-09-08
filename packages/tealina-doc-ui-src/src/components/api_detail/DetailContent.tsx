import { CopyOutlined } from '@ant-design/icons'
import {
  DocKind,
  type ApiDoc,
  type DocItem,
  type DocNode,
  type Entity,
  type NumberLiteral,
  type ObjectType,
  type TupleEntity,
} from '@tealina/doc-types'
import { Button, Card, Segmented, Spin, Tabs, Tag, type TabsProps } from 'antd'
import { useAtomValue } from 'jotai'
import { Suspense, lazy } from 'react'
import { curJsonSourceAtom } from '../../atoms/jsonSourceAtom'
import { syntaxColorAtom } from '../../atoms/themeAtom'
import { type2cell } from '../../transformer/type2cell'
import { getMethodColor } from '../../utils/methodColors'
import { Anchor } from '../Anchor'
import { ColorText } from '../ColorText'
import { EntityTable } from '../EntityTable'
import { EnumTable } from '../EnumTable'
import { MarkdownView } from '../Markdown'
import type { OneApiDoc as OneApiSummary } from './ApiDetail'
import {
  appearedEntity2doc,
  getNestEntity,
  toPropType,
  useDetailState,
  type AppearedEntity,
  type EntityOnlyDoc,
  type MemoedAppearedEntity,
  type PayloadKeys,
  type SegmentTabKeys,
} from './useDetailState'
import { kResKey, kStatusCodeKey } from '../../constans/configKeys'

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
  const color = getMethodColor(identity.method)
  return (
    <div className="p-3 h-screen flex flex-col">
      <div className="text-lg flex-shrink-0">
        <div className="group">
          <Tag className="uppercase text-16px px-3 py-1" color={color}>
            {identity.method}
          </Tag>
          <ColorText type="string" className="tracking-wider">
            {[source.baseURL, identity.path].join('')}
          </ColorText>
          <CopyButton
            identity={identity}
            className="invisible group-hover:visible pl-2"
          />
        </div>
        <Card className="mt-3 min-h-18" bodyStyle={{ padding: '10px' }}>
          <MarkdownView>{docItem.comment}</MarkdownView>
        </Card>
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
            memoMap={new Map([...memoMap.entries()].map(([k, v]) => [k, v]))}
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
  keyPrefix,
}: {
  memoMap: MemoedAppearedEntity
  docItem: DocItem
  doc: ApiDoc
  curTab: SegmentTabKeys
  keyPrefix: string
}) {
  const key = curTab as PayloadKeys
  const targetNode = docItem[key]
  if (targetNode == null) {
    return null
  }
  function renderContent(beginDoc: DocNode) {
    if (!memoMap.has(`${keyPrefix}/${key}`)) {
      const results: AppearedEntity[] = []
      getNestEntity(beginDoc, doc, results)
      memoMap.set(key, results)
    }
    const record = memoMap.get(key) ?? []
    // if (isEmpty(record)) {
    //   // const tabItem = docItem[key]
    //   // if (tabItem == null) {
    //   //   return null
    //   // }
    //   if (beginDoc.kind === DocKind.LiteralObject) {
    //     return <EntityTable entity={{ ...beginDoc, name: '{...}' }} key={id} id={id} doc={doc} />
    //   }
    //   return type2cell(beginDoc, doc)
    // }
    const parsedDoc = appearedEntity2doc(record)
    const contents = record.map(k => {
      switch (k.belong) {
        case 'entity': {
          return (
            <EntityTable
              entity={k.value}
              key={k.id}
              id={String(k.id)}
              doc={parsedDoc}
            />
          )
        }
        case 'enum': {
          if (k.value.name === '') return null
          return <EnumTable enumEntity={k.value} key={k.id} id={String(k.id)} />
        }
        case 'nonLiteral': {
          return <NonLiteralEntity key={k.value.type} obj={k.value} />
        }
        case 'tuple': {
          return (
            <TupleContent
              obj={k.value}
              id={String(k.id)}
              key={k.id}
              doc={parsedDoc}
            />
          )
        }
        case 'literal': {
          const key = Math.random().toString(16)
          return (
            <EntityTable
              entity={{ ...k.value, name: '{...}' }}
              key={key}
              id={key}
              doc={parsedDoc}
            />
          )
        }
      }
    })
    return <div className="flex flex-col gap-10">{contents}</div>
  }
  const node2tabItem = (
    v: DocNode,
  ): NonNullable<TabsProps['items']>[number] => {
    switch (v.kind) {
      case DocKind.EntityRef: {
        const entity = doc.entityRefs[v.id]
        const key = String(v.id)
        return {
          key,
          tabKey: key,
          label: entity.name,
          children: renderContent(v),
        }
      }
      case DocKind.Array: {
        const item = node2tabItem(v.element)
        const { label } = item
        item.label = String(label).includes('|')
          ? `(${label}) [ ]`
          : `${label} [ ]`
        return item
      }
      case DocKind.LiteralObject: {
        const statusCodeProp = v.props.find(p => p.name === kStatusCodeKey)
        if (statusCodeProp == null) {
          const key = Math.random().toString(16)
          return {
            key,
            tabKey: key,
            label: '{...}',
            children: renderContent(v),
          }
        }
        const statusCode = `${(statusCodeProp as NumberLiteral).value}`
        const resProp = v.props.find(
          v => v.name === kResKey,
        ) as DocNode | null
        if (resProp != null) {
          return {
            key: statusCode,
            label: statusCode,
            children: renderContent(resProp),
          }
        }
        return { key: statusCode, label: statusCode, children: <p></p> }
      }
      default: {
        //  return type2text(v,doc)
        const key = Math.random().toString(16)
        return {
          key,
          tabKey: key,
          label: curTab,
          children: type2cell(v, doc),
          // label: 'PARSER_ERROR',
          // children: (<p className='text-red'>
          //   <span>Unexpect doc node</span>
          //   {JSON.stringify(v)}</p>)
        }
      }
    }
  }
  if (curTab !== 'response') {
    return (
      <div className="flex flex-col gap-3 pb-10">
        {renderContent(targetNode)}
      </div>
    )
  }
  const tabItems =
    targetNode.kind === DocKind.Union
      ? targetNode.types.map(node2tabItem)
      : [node2tabItem(targetNode)]

  return (
    <div className="flex flex-col gap-3 pb-10">
      {/* {renderEntities()} */}
      <Tabs items={tabItems} tabPosition="left" />
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
  doc: EntityOnlyDoc
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
  memoMap: Map<SegmentTabKeys, AppearedEntity[]>
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

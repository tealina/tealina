import type { ApiDoc, DocNode } from '@tealina/doc-types'
import { DocKind } from '@tealina/doc-types'
import { type ReactElement, type ReactNode, cloneElement } from 'react'
import { ColorText } from '../components/ColorText'
import { keyedNodes, nodeKey } from '../utils/nodeKey'

const id2name = (id: number) => ['{', id, '}'].join(' ')

type Cell = { key: string; element: ReactElement }

/** Joins cells with a divider; every cell keeps the key it was given. */
function injectDivider(cells: Cell[], divider = ' | ') {
  return cells.flatMap(({ key, element }, i) =>
    i === 0
      ? [cloneElement(element, { key })]
      : [
          <span key={`divider-${key}`}>{divider}</span>,
          cloneElement(element, { key }),
        ],
  )
}

export function type2cell(
  d: DocNode,
  doc: Pick<ApiDoc, 'entityRefs' | 'enumRefs' | 'tupleRefs'>,
  isExpandLiterialObj = true,
): ReactElement {
  const { entityRefs, enumRefs } = doc
  switch (d.kind) {
    case DocKind.Array:
      return (
        <>
          {type2cell(d.element, doc, isExpandLiterialObj)}
          <span className="dark:text-white tracking-[5px]">[]</span>
        </>
      )
    // case local
    case DocKind.Primitive:
      return <ColorText type={d.type}>{d.type}</ColorText>
    case DocKind.EntityRef: {
      const refName = entityRefs[d.id].name
      const showName = refName.length > 0 ? refName : id2name(d.id)
      // const showName = refName.length > 0 ? refName : d.name
      return (
        <ColorText type="object">
          <a className="text-inherit" href={`#${d.id}`}>
            {showName}
          </a>
        </ColorText>
      )
    }
    case DocKind.EnumRef: {
      const target = enumRefs[d.id]
      const eShowName = target.name
      if (eShowName === '') {
        const cells = target.members.map(v => ({
          key: `${v.memberId}-${nodeKey(v.value)}`,
          element: type2cell(v.value, doc, isExpandLiterialObj),
        }))
        return <>{injectDivider(cells)}</>
      }
      return (
        <ColorText type="object">
          <a className="text-inherit" href={`#${d.id}`}>
            {eShowName}
          </a>
        </ColorText>
      )
    }
    case DocKind.EnumMemberRef: {
      const member = enumRefs[d.enumId].members.find(
        v => v.memberId === d.memberId,
      )
      return <ColorText type="enum">{member?.key}</ColorText>
    }
    case DocKind.NonLiteralObject:
      return (
        <ColorText type="object">
          <a className="text-inherit" href={`#${d.type}`}>
            {d.type}
          </a>
        </ColorText>
      )
    case DocKind.Record:
      return (
        <RecordTypeText
          keyPart={type2cell(d.key, doc, isExpandLiterialObj)}
          valuePart={type2cell(d.value, doc, isExpandLiterialObj)}
        />
      )
    case DocKind.Union:
      return (
        <>
          {injectDivider(
            keyedNodes(d.types).map(({ key, node }) => ({
              key,
              element: type2cell(node, doc, isExpandLiterialObj),
            })),
          )}
        </>
      )
    case DocKind.Tuple:
      return (
        <span className="inline-flex gap-[3px]">
          <span>[</span>
          {d.elements.length ? (
            <span>
              {injectDivider(
                keyedNodes(d.elements).map(({ key, node }) => ({
                  key,
                  element: type2cell(node, doc, isExpandLiterialObj),
                })),
                ', ',
              )}
            </span>
          ) : null}
          <span>]</span>
        </span>
      )
    case DocKind.Never:
      return <ColorText type="any">never</ColorText>
    case DocKind.StringLiteral:
      return <ColorText type="string">"{d.value}"</ColorText>
    case DocKind.NumberLiteral:
      return <ColorText type="number">{d.value}</ColorText>
    case DocKind.RecursionTuple:
      return (
        <ColorText type="object">
          <a className="text-inherit" href={`#${d.id}`}>
            {doc.tupleRefs[d.id].name}
          </a>
        </ColorText>
      )
    case DocKind.RecursionEntity:
      return (
        <ColorText type="object">
          <a className="text-inherit" href={`#${d.id}`}>
            {doc.entityRefs[d.id].name}
          </a>
        </ColorText>
      )
    case DocKind.LiteralObject: {
      if (!isExpandLiterialObj) {
        let name = d.name
        if (name == null) {
          const [firstProp] = d.props
          name = `{ ${firstProp.name} ... }`
        }
        return <ColorText type="object">{name}</ColorText>
      }
      const nest = d.props.map(n => (
        <div key={n.name} className="pl-4">
          <ColorText type="prop">{n.name}</ColorText>
          <span>{n.isOptional ? '?' : ''}</span>:{' '}
          {type2cell(n, doc, isExpandLiterialObj)}
          {','}
        </div>
      ))
      return (
        <span>
          {'{ '}
          {nest}
          {' }'}
        </span>
      )
    }
    default:
      return <span />
  }
}

function RecordTypeText({
  keyPart,
  valuePart,
}: {
  keyPart: ReactNode
  valuePart: ReactNode
}) {
  return (
    <span>
      <ColorText type="any">Record</ColorText>
      <span>{'<'}</span>
      {keyPart}
      <span> , </span>
      {valuePart}
      <span>{'>'}</span>
    </span>
  )
}

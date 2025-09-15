import type { ApiDoc, DocNode } from '@tealina/doc-types'
import { DocKind } from '@tealina/doc-types'
import { type ReactElement, type ReactNode, cloneElement } from 'react'
import { ColorText } from '../components/ColorText'

const id2name = (id: number) => ['{', id, '}'].join(' ')

function injectDivider([first, ...rest]: ReactElement[], divider = ' | ') {
  return [first]
    .concat(rest.flatMap((v, i) => [<span key={i}>{divider}</span>, v]))
    .map((e: ReactElement, i: number) => cloneElement(e, { key: i }))
}

export function type2cell(
  d: DocNode,
  doc: Pick<ApiDoc, 'entityRefs' | 'enumRefs' | 'tupleRefs'>,
  isExpandLiterialObj = true
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
        const textList = target.members.map(v => type2cell(v.value, doc, isExpandLiterialObj))
        return <>{injectDivider(textList)}</>
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
      return <>{injectDivider(d.types.map(t => type2cell(t, doc, isExpandLiterialObj)))}</>
    case DocKind.Tuple:
      return (
        <span className="inline-flex gap-[3px]">
          <span>[</span>
          {d.elements.length ? (
            <span>
              {injectDivider(
                d.elements.map(t => type2cell(t, doc, isExpandLiterialObj)),
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
        return <span>{`{...}`}</span>
      }
      const nest = d.props.map(n => (
        <div key={n.name} className="pl-4">
          <ColorText type="prop">{n.name}</ColorText>
          <span>{n.isOptional ? '?' : ''}</span>: {type2cell(n, doc, isExpandLiterialObj)}
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

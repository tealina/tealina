import { ReactElement, ReactNode, cloneElement } from 'react'
import type { DocNode } from '@tealina/doc-types'
import { DocKind } from '@tealina/doc-types'
import { ColorText } from '../components/ColorText'
import { OneApiScopeEntitie } from '../components/api_detail/useDetailState'

const id2name = (id: number) => ['{', id, '}'].join(' ')

function injectDivider([first, ...rest]: any[], divider = ' | ') {
  return [first]
    .concat(rest.map(v => [<span>{divider}</span>, v]).flat())
    .map((e: ReactElement, i: number) => cloneElement(e, { key: i }))
}

export function type2cell(
  d: DocNode,
  doc: Omit<OneApiScopeEntitie, 'nonLiterals'>,
): ReactElement {
  const { entityRefs, enumRefs } = doc
  switch (d.kind) {
    case DocKind.Array:
      return (
        <>
          {type2cell(d.element, doc)}
          <span className="dark:text-white tracking-[3px]">[]</span>
        </>
      )
    // case local
    case DocKind.Primitive:
      return <ColorText type={d.type}>{d.type}</ColorText>
    case DocKind.EntityRef:
      let refName = entityRefs[d.id].name
      const showName = refName.length > 0 ? refName : id2name(d.id)
      // const showName = refName.length > 0 ? refName : d.name
      return (
        <ColorText type="object">
          <a className="text-inherit" href={`#${d.id}`}>
            {showName}
          </a>
        </ColorText>
      )
    case DocKind.EnumRef:
      const eShowName = enumRefs[d.id].name
      return (
        <ColorText type="object">
          <a className="text-inherit" href={`#${d.id}`}>
            {eShowName}
          </a>
        </ColorText>
      )
    case DocKind.EnumMemberRef:
      const member = enumRefs[d.enumId].members.find(
        v => v.memberId == d.memberId,
      )
      return <ColorText type="enum">{member?.key}</ColorText>
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
          keyPart={type2cell(d.key, doc)}
          valuePart={type2cell(d.value, doc)}
        />
      )
    case DocKind.Union:
      return <>{injectDivider(d.types.map(t => type2cell(t, doc)))}</>
    case DocKind.Tuple:
      return (
        <span className="inline-flex gap-[3px]">
          <span>[</span>
          <span>
            {d.elements.length
              ? injectDivider(
                  d.elements.map(t => type2cell(t, doc)),
                  ', ',
                )
              : ''}
          </span>
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
    default:
      return <span></span>
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

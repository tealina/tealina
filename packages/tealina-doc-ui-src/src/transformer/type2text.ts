import { isEmpty } from 'fp-lite'
import type { ApiDoc, DocNode } from '@tealina/doc-types'
import { DocKind } from '@tealina/doc-types'

const id2name = (id: number) => ['{', id, '}'].join(' ')

export function type2text(
  d: DocNode,
  doc: Omit<ApiDoc, 'apis' | 'docTypeVersion'>,
): string {
  const { entityRefs, enumRefs } = doc
  switch (d.kind) {
    case DocKind.Array:
      return `${type2text(d.element, doc)}[ ]`
    case DocKind.NonLiteralObject:
    case DocKind.Primitive:
      return d.type
    case DocKind.EntityRef: {
      const refName = entityRefs[d.id].name
      const showName = refName.length > 0 ? refName : id2name(d.id)
      // const showName = refName.length > 0 ? refName : d.name
      return showName
    }
    case DocKind.EnumRef:
      return enumRefs[d.id].name
    case DocKind.EnumMemberRef: {
      const member = enumRefs[d.enumId].members.find(
        v => v.memberId === d.memberId,
      )
      return member!.key
    }
    case DocKind.Record:
      return `Record<${type2text(d.key, doc)}, ${type2text(d.value, doc)}>`
    case DocKind.Union:
      return d.types.map(t => type2text(t, doc)).join(' | ')
    case DocKind.Tuple:
      if (isEmpty(d.elements)) return '[ ]'
      return `[${d.elements.map(t => type2text(t, doc)).join(', ')}]`
    case DocKind.Never:
      return 'never'
    case DocKind.StringLiteral:
    case DocKind.NumberLiteral:
      return String(d.value)
    case DocKind.RecursionTuple: {
      const target = doc.tupleRefs[d.id]
      return target.name
    }
    case DocKind.RecursionEntity: {
      const obj = entityRefs[d.id]
      return obj.name
    }
    default:
      return ''
  }
}

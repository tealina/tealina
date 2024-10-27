import { Table, type TableProps } from 'antd'
import { useAtomValue } from 'jotai'
import type { EnumEntity, EnumMember } from '@tealina/doc-types'
import { DocKind } from '@tealina/doc-types'
import { syntaxColorAtom } from '../atoms/themeAtom'
import { ColorText } from './ColorText'
import { CommentSummary } from './CommentSummary'
import { OneApiScopeEntitie } from './api_detail/useDetailState'

export function EnumTable({
  enumEntity,
  id,
}: {
  id: string
  enumEntity: EnumEntity
}) {
  const TypeColors = useAtomValue(syntaxColorAtom)
  const columns: TableProps<EnumMember>['columns'] = [
    {
      title: 'Key',
      key: 'key',
      dataIndex: 'key',
      width: 200,
      render: v => <ColorText type="prop">{v}</ColorText>,
    },
    {
      title: 'Value',
      key: 'value',
      dataIndex: 'value',
      render: (v: EnumMember['value']) => {
        switch (v.kind) {
          case DocKind.StringLiteral:
            return <ColorText type="string">"{v.value}"</ColorText>
          case DocKind.NumberLiteral:
            return <ColorText type="number">{v.value}</ColorText>
          case DocKind.Primitive:
            return <ColorText type={v.type}>{v.type}</ColorText>
          case DocKind.Never:
            return <ColorText type="any">Never</ColorText>
          default:
            return <span className="text-red-500">Unresolved Type</span>
        }
      },
    },
    {
      title: 'Comment',
      key: 'comment',
      dataIndex: 'comment',
    },
  ]
  return (
    <div>
      <div className="flex gap-3 items-end">
        <h3
          className="text-lg font-bold"
          style={{ color: TypeColors.any }}
          id={id}
        >
          {enumEntity.name}
        </h3>
        {enumEntity.comment && <CommentSummary comment={enumEntity.comment} />}
      </div>
      <Table
        rowKey="key"
        columns={columns}
        dataSource={enumEntity.members}
        pagination={false}
      />
    </div>
  )
}

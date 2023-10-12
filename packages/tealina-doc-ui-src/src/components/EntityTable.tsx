import { Table, TableProps } from 'antd'
import { useAtomValue } from 'jotai'
import type { Entity, PropType } from '@tealina/doc-types'
import { syntaxColorAtom } from '../atoms/themeAtom'
import { type2cell } from '../transformer/type2cell'
import { ColorText } from './ColorText'
import { CommentSummary } from './CommentSummary'
import { OneApiScopeEntitie } from './api_detail/useDetailState'
import { Anchor } from './Anchor'

export function EntityTable({
  entity,
  doc,
  id,
}: {
  id: string
  entity: Entity
  doc: OneApiScopeEntitie
}) {
  const TypeColors = useAtomValue(syntaxColorAtom)
  const columns: TableProps<PropType>['columns'] = [
    {
      title: 'Name',
      width: '20%',
      key: 'name',
      dataIndex: 'name',
      render: (v, record) => (
        <span>
          <ColorText type="prop">{v}</ColorText>
          <span>{record.isOptional ? ' ?' : ''}</span>
        </span>
      ),
    },
    {
      title: 'Type',
      width: '25%',
      key: 'parsedType',
      dataIndex: 'name',
      render: (v, record) => type2cell(record, doc),
    },
    {
      title: 'Comment',
      width: '35%',
      key: 'comment',
      dataIndex: 'comment',
    },
    {
      title: 'Default Value',
      width: '20%',
      key: 'defaultValue',
      dataIndex: 'jsDoc',
      render: v => v?.comment,
    },
  ]
  return (
    <div>
      <div className="flex gap-3 items-end">
        <Anchor id={id} style={{ color: TypeColors.any }}>
          {entity.name}
        </Anchor>
        {entity.comment && <CommentSummary comment={entity.comment} />}
      </div>
      <Table
        rowKey="name"
        rowClassName="text-[15px]"
        columns={columns}
        dataSource={entity.props}
        pagination={false}
      />
    </div>
  )
}

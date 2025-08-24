import type { Entity, PropType } from '@tealina/doc-types'
import { Card, Table, Tag, type TableProps } from 'antd'
import { useAtomValue } from 'jotai'
import { syntaxColorAtom } from '../atoms/themeAtom'
import { type2cell } from '../transformer/type2cell'
import { Anchor } from './Anchor'
import { ColorText } from './ColorText'
import { CommentSummary } from './CommentSummary'
import type { EntityOnlyDoc } from './api_detail/useDetailState'

export function EntityTable({
  entity,
  doc,
  id,
}: {
  id: string
  entity: Entity
  doc: EntityOnlyDoc
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
      width: '30%',
      key: 'parsedType',
      dataIndex: 'name',
      render: (_v, record) => type2cell(record, doc),
    },
    {
      title: 'Comment',
      width: '30%',
      key: 'comment',
      dataIndex: 'comment',
      render: (comment, record) => {
        const isDeperated = record.jsDoc?.deprecated != null
        return <span>
          {isDeperated ? <><Tag>deprecated</Tag>
            <br />
          </> : null}
          {comment}
        </span>
      }
    },
    {
      title: 'Default Value',
      width: '20%',
      key: 'defaultValue',
      dataIndex: 'jsDoc',
      render: v => v?.default,
    },
  ]
  return (
    <Card bodyStyle={{ padding: 10 }}>
      <div className='text-lg'>
        <div>
          {entity.comment && <CommentSummary comment={entity.comment} />}
          <Anchor id={id} style={{ color: TypeColors.any }}>
            {entity.name}
          </Anchor>
        </div>
        <Table
          rowKey="name"
          rowClassName="text-lg"
          columns={columns}
          dataSource={entity.props}
          pagination={false}
        />
      </div>
    </Card>
  )
}

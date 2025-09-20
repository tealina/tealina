import type { Entity, PropType } from '@tealina/doc-types'
import { Card, Table, Tag, type TableProps } from 'antd'
import { useAtomValue } from 'jotai'
import { ReactNode } from 'react'
import { syntaxColorAtom } from '../atoms/themeAtom'
import { type2cell } from '../transformer/type2cell'
import { Anchor } from './Anchor'
import { ColorText } from './ColorText'
import { CommentSummary } from './CommentSummary'
import type { EntityOnlyDoc } from './api_detail/useDetailState'
import { MarkdownView } from './Markdown'

export function EntityTable({
  entity,
  doc,
  id,
}: {
  id: string
  entity: Omit<Entity, 'name'> & { name?: string }
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
        const { jsDoc = {} } = record
        return (
          <div>
            <div className='flex flex-wrap gap-2 max-w-40vw'>
              {jsDoc.deprecated ? (
                <>
                  <Tag>deprecated</Tag>
                  <br />
                </>
              ) : null}
              {jsDoc.format ? <LabelTag label='fmt' text={jsDoc.format} /> : null}
              {jsDoc.example ? <LabelTag label='eg' text={String(jsDoc.example)} /> : null}
            </div>
            <div className='-my-4'>
              <MarkdownView>{comment}</MarkdownView>
            </div>
          </div>
        )
      },
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
      <div className="text-lg">
        <div>

          {entity.comment && <div className='-my-4'><MarkdownView>{entity.comment}</MarkdownView></div>}
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

function LabelTag({ label, text }: { label: string, text: ReactNode }) {
  return (
    <div className='flex gap-1 outline-blue/20 outline-solid w-max rounded dark:text-white/65 text-black/65'>
      <div className='pl-1'>{label}:</div>
      <div className='px-1'>{text}</div>
    </div>
  )
}
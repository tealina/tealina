import { PlayCircleFilled } from '@ant-design/icons'
import type { ApiDoc, DocItem, Entity } from '@tealina/doc-types'
import { Form } from 'antd'
import { useMemo } from 'react'
import { prop2item } from '../../../transformer/prop2item'
import { JsonView } from '../../monaco/JsonView'
import { SubmitBtn } from '../../SubmitBtn'
import { useSumit } from './useSubmit'

const Playground = (props: {
  entity: Entity
  doc: ApiDoc
  method: string
  path: string
  docItem: DocItem
  cacheKey: string
}) => {
  const { entity, doc } = props
  const { states, form, handleSubmit } = useSumit(props)
  const formItems = useMemo(() => {
    return entity.props.length > 0 ? (
      entity.props.map(p => prop2item(doc, p))
    ) : (
      <div className="text-white">No payload required</div>
    )
  }, [])
  return (
    <div className="flex gap-3 h-full">
      <div className="flex-1">
        <Form form={form} labelCol={{ offset: 2 }}>
          {formItems}
        </Form>
      </div>
      <div className="mt-10">
        <SubmitBtn
          icon={<PlayCircleFilled />}
          onSubmit={() => form.validateFields().then(handleSubmit)}
        />
      </div>
      <div className="flex-1">
        <div>
          <span>Status Code: </span>
          {states.statusCode}
        </div>
        {states.isError ? (
          <p className="h-full p-3 whitespace-pre-wrap dark:bg-[rgb(30,30,30)] text-red-500 bg-white">
            {states.code}
          </p>
        ) : (
          <JsonView value={states.code} language="json" className="h-full" />
        )}
      </div>
    </div>
  )
}

export default Playground

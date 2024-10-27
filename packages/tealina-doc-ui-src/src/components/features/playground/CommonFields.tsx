import { Button, Form, Input, InputNumber } from 'antd'
import FormItem from 'antd/es/form/FormItem'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import {
  commonFieldsAtom,
  commonInitialValueAtom,
} from '../../../atoms/jsonSourceAtom'
import { kConfigKey } from '../../../constans/configKeys'

export function ComonFields({ onSaved }: { onSaved: () => void }) {
  const fields = useAtomValue(commonFieldsAtom)
  const setCommonInitialValue = useSetAtom(commonInitialValueAtom)
  const [form] = Form.useForm()
  const entries = Object.entries(fields ?? {})
  useEffect(() => {
    const storage = window.sessionStorage.getItem(kConfigKey.FILEDS_VALUES)
    if (storage == null) return
    form.setFieldsValue(JSON.parse(storage))
  }, [])
  if (entries.length < 1) return <div>Empty</div>
  return (
    <Form
      form={form}
      labelCol={{ offset: 1 }}
      onFinish={values => {
        setCommonInitialValue(values)
        window.sessionStorage.setItem(
          kConfigKey.FILEDS_VALUES,
          JSON.stringify(values),
        )
        onSaved()
      }}
    >
      {entries.map(([name, record]) => {
        return (
          <FormItem noStyle key={name}>
            <div className="capitalize">{name}</div>
            {Object.entries(record).map(([field, config]) => {
              const actual =
                typeof config === 'object'
                  ? config
                  : { type: config, default: void 0 }
              return (
                <FormItem
                  name={[name, field]}
                  label={field}
                  key={field}
                  initialValue={actual.default}
                >
                  {actual.type === 'string' ? <Input /> : <InputNumber />}
                </FormItem>
              )
            })}
          </FormItem>
        )
      })}
      <FormItem>
        <Button
          onClick={() => {
            form.submit()
          }}
        >
          Save
        </Button>
      </FormItem>
    </Form>
  )
}

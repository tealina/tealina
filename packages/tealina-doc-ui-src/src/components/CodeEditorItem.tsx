import FormItem from 'antd/es/form/FormItem'
import { InternalNamePath } from 'antd/es/form/interface'
import { useState } from 'react'
import { PropType } from '@tealina/doc-types'
import { Editor } from './monaco/JsonEditor'

function JSON5Editor({
  onChange,
  onValid,
  onError,
  hint,
  value,
}: {
  value?: any
  onChange?: (x: any) => void
  hint: string
  onError: (x: any) => void
  onValid: () => void
}) {
  const defaultValue = [hint, value ? JSON.stringify(value) : ''].join('\n')
  return (
    <Editor
      defaultValue={defaultValue}
      className="h-60"
      onBlur={editor => {
        try {
          const fullValue = editor.getValue()
          const validLines = fullValue
            .split('\n')
            .filter(v => !v.startsWith('/'))
          onChange?.(JSON.parse(validLines.join('')))
          onValid()
        } catch (error) {
          console.log(error)
          onError(String(error))
        }
      }}
    />
  )
}

const withCommentSymbol = (hint?: string) =>
  hint != null ? `/** ${hint} */` : ''

export function CodeEditorItem({
  preNamepath,
  info,
  hint,
}: {
  info: PropType
  hint: string
  preNamepath: InternalNamePath
}) {
  const [message, setMessage] = useState<string | null>(null)
  const cleanMsg = () => {
    setMessage(null)
  }
  return (
    <FormItem
      key={[...preNamepath, info.name].join('_')}
      name={[...preNamepath, info.name]}
      label={String(info.name)}
      validateStatus={message == null ? void 0 : 'error'}
      help={message}
      rules={[
        {
          required: !info.isOptional,
          validator: async (rule, v) => {
            if (Array.isArray(v)) return
            if (rule.required && v == null) return Promise.reject(null)
          },
        },
      ]}
    >
      <JSON5Editor
        hint={withCommentSymbol(hint)}
        onError={setMessage}
        onValid={cleanMsg}
      />
    </FormItem>
  )
}

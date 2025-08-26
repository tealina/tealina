import FormItem from 'antd/es/form/FormItem'
import type { InternalNamePath } from 'antd/es/form/interface'
import { useState } from 'react'
import type { PropType } from '@tealina/doc-types'
import { JsonEditor } from './monaco/JsonEditor'

function JSON5Editor({
  onChange,
  onValid,
  onError,
  hint,
  value,
}: {
  value?: unknown
  onChange?: (x: unknown) => void
  hint: string
  onError: (x: string | null) => void
  onValid: () => void
}) {
  const defaultValue = value ? JSON.stringify(value) : ''
  return (
    <JsonEditor
      hint={hint}
      defaultValue={defaultValue}
      className="h-60"
      onBlur={fullValue => {
        try {
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

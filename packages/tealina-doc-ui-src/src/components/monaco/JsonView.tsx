import { useEffect } from 'react'
import { useMonaco } from './useMonaco'

export const JsonView = ({
  value,
  className,
  language,
}: {
  value: string
  language?: 'json' | 'text'
  className?: string
}) => {
  const { monacoEl, editor } = useMonaco({
    readOnly: true,
    defaultValue: value,
    language,
  })
  useEffect(() => {
    editor?.setValue(value)
  }, [value])
  return <div className={className} ref={monacoEl} />
}

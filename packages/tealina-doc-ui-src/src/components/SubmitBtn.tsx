import { Button, type ButtonProps } from 'antd'
import { useState } from 'react'

export const SubmitBtn = (
  props: Omit<ButtonProps, 'onClick'> & { onSubmit: () => Promise<any> },
) => {
  const [submitting, setSubmitting] = useState(props.loading ?? false)
  const { onSubmit, loading, ...rest } = props
  const handleSubmit = async () => {
    setSubmitting(true)
    onSubmit().finally(() => {
      setSubmitting(false)
    })
  }
  return <Button onClick={handleSubmit} loading={submitting} {...rest} />
}

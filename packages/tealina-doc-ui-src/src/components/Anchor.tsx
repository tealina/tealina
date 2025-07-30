import { Typography } from 'antd'
import type { CSSProperties, ReactNode } from 'react'

export function Anchor(props: {
  style?: CSSProperties
  children: ReactNode
  id: string
}) {
  return (
    <Typography.Title className="font-bold target:animate-swing my-0" {...props} />
  )
}

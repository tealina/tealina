import type { CSSProperties, ReactNode } from 'react'

export function Anchor(props: {
  style?: CSSProperties
  children: ReactNode
  id: string
}) {
  return (
    <div className="text-lg font-bold target:animate-swing w-max" {...props} />
  )
}
